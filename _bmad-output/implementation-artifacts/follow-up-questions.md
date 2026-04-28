# Story: Adaptive Follow-Up Questions Before Triage

**Branch:** `feature/follow_up_questions`

As a patient,
I want the system to ask me a clarifying question when my symptom description is insufficient,
So that the triage result is based on enough information to be meaningful.

---

## Context & Design

This feature adds a confidence-gated follow-up loop to the triage pipeline. When the LLM cannot produce a confident triage from the initial symptom input, it returns a clarifying question instead of a triage result. The patient answers, and the answer is appended to the original symptoms string before the next LLM call. The loop is bounded by a configurable maximum; at the limit, the LLM triages with whatever context it has.

**Key design decisions (from brainstorming session 2026-04-28):**
- The follow-up trigger is **hidden** — the patient experiences natural conversation, not a visible confidence indicator
- Follow-up questions are **LLM-generated on the fly** (curated bank deferred to v2)
- Max follow-up count is **configurable**, not hardcoded
- At max count, **always produce a triage result** — never leave the patient without an answer
- Each Q&A pair is **concatenated** to the symptoms string — no special conversation history format, existing triage pipeline unchanged

---

## Acceptance Criteria

### Backend — Schema

**Given** `backend/app/schemas/triage.py`
**When** this story is implemented
**Then** `TriageRequest` gains two new optional fields:
- `follow_up_count: int = 0` — number of follow-up rounds already completed by this patient
- `conversation_context: str = ""` — accumulated Q&A pairs from prior follow-up rounds, formatted as plain text

**And** a new `FollowUpResponse` Pydantic model is added:
```python
class FollowUpResponse(BaseModel):
    type: Literal["follow_up"] = "follow_up"
    question: str
    follow_up_count: int
```

**And** the `POST /api/v1/triage` endpoint response type is `TriageResponse | FollowUpResponse` — both return HTTP 200

---

### Backend — Configuration

**Given** `backend/app/core/config.py`
**When** this story is implemented
**Then** a new config value `MAX_FOLLOW_UP_QUESTIONS: int` is loaded from the environment variable `MAX_FOLLOW_UP_QUESTIONS` with a default of `2`

---

### Backend — LLM Service

**Given** `backend/app/services/llm_service.py`
**When** `follow_up_count < MAX_FOLLOW_UP_QUESTIONS` and the LLM determines the symptoms are insufficient
**Then** a new prompt template `_HUMAN_TEMPLATE_WITH_FOLLOWUP` extends `_HUMAN_TEMPLATE` with an additional instruction block:

```
If the symptoms are too vague to confidently triage, you may instead return:
{"follow_up_question": "<one concise clarifying question in {output_language}>"}
Only do this if a single targeted question would meaningfully improve your confidence.
Do not ask follow-up questions if follow_up_count >= {max_follow_ups}.
Current follow_up_count: {follow_up_count}
```

**And** `_invoke_chain_sync` and `classify` accept two new parameters: `follow_up_count: int = 0` and `max_follow_ups: int = 2`

**And** `_parse_response` is extended to detect `follow_up_question` in the parsed JSON and return `{"follow_up_question": "<string>"}` without raising `LLMParseError`

**And** when `follow_up_count >= max_follow_ups`, the follow-up instruction block instructs the LLM to always return a full triage result regardless of confidence

**And** symptom text and conversation context are **never** included in any log statement at any log level (existing NFR5/NFR6 invariant preserved)

---

### Backend — Triage Service

**Given** `backend/app/services/triage_service.py`
**When** `triage_service.classify(symptoms, patient_id, lang, follow_up_count, conversation_context)` is called
**Then** the enriched symptoms string passed to the LLM is constructed as:

```
{original symptoms}

{conversation_context}
```

Where `conversation_context` is the accumulated Q&A pairs (empty string on first call)

**And** if `llm_classify` returns a dict with key `follow_up_question` AND `follow_up_count < MAX_FOLLOW_UP_QUESTIONS`:
- The triage service returns a `FollowUpResponse(question=..., follow_up_count=follow_up_count + 1)` immediately
- No queue entry is written (triage is not yet complete)

**And** if `follow_up_count >= MAX_FOLLOW_UP_QUESTIONS`, the LLM is instructed to return a full triage result — the follow-up path is never taken

**And** the existing three-tier fallback chain (RAG → base LLM → safe default) is unchanged and wraps the entire new logic

**And** the function signature becomes:
```python
async def classify(
    symptoms: str,
    patient_id: str,
    lang: str = "el",
    follow_up_count: int = 0,
    conversation_context: str = "",
) -> TriageResponse | FollowUpResponse:
```

---

### Backend — Router

**Given** `backend/app/routers/triage.py`
**When** `POST /api/v1/triage` is called
**Then** the router passes `request.follow_up_count` and `request.conversation_context` to `triage_service.classify`

**And** the `response_model` annotation is updated to `TriageResponse | FollowUpResponse`

**And** both response types serialize to HTTP 200 — no status code change

---

### Frontend — Types

**Given** `frontend/app/lib/types.ts`
**When** this story is implemented
**Then** `TriageRequest` gains two new optional fields:
```typescript
follow_up_count?: number  // default 0
conversation_context?: string  // default ""
```

**And** a new `FollowUpResponse` interface is added:
```typescript
export interface FollowUpResponse {
  type: "follow_up"
  question: string
  follow_up_count: number
}
```

---

### Frontend — API

**Given** `frontend/app/lib/api.ts`
**When** `submitTriage` is called
**Then** the function signature becomes:
```typescript
export async function submitTriage(
  symptoms: string,
  patientId: string,
  lang: "en" | "el",
  followUpCount: number = 0,
  conversationContext: string = ""
): Promise<TriageResponse | FollowUpResponse>
```

**And** `follow_up_count` and `conversation_context` are included in the request body

**And** the caller is responsible for detecting `type === "follow_up"` in the response

---

### Frontend — TriageForm

**Given** `frontend/app/components/TriageForm.tsx`
**When** the triage API returns a `FollowUpResponse`
**Then** `TriageForm` enters a follow-up state displaying:
- The follow-up question text in a visually distinct block (e.g. a bordered callout)
- A text input for the patient's answer
- A submit button to send the answer (labelled in the active language)
- The original symptoms are no longer editable during follow-up rounds

**And** on answer submission, `submitTriage` is called with:
- `symptoms` = original symptoms (unchanged)
- `followUpCount` = the `follow_up_count` value from the last `FollowUpResponse`
- `conversationContext` = the accumulated string, formatted as:
  ```
  Q: {question}\nA: {answer}
  ```
  appended to any prior `conversationContext` with a blank line separator

**And** if the follow-up answer call returns another `FollowUpResponse`, the question is replaced with the new one and the cycle repeats

**And** if the follow-up answer call returns a `TriageResponse`, the normal `onResult(result)` flow proceeds

**And** a "back" action resets the form to its initial state (clears all follow-up state)

**And** loading and error states apply to follow-up answer submission identically to the initial submission

**And** the follow-up question and answer input are labelled in Greek (or English per active language) — no hardcoded strings; translations are added to `translations.ts`

---

### Frontend — Translations

**Given** `frontend/app/lib/translations.ts`
**When** this story is implemented
**Then** both `en` and `el` translation objects gain a `followUp` key:
```typescript
followUp: {
  questionLabel: "...",  // e.g. "The assistant needs more information:"
  answerPlaceholder: "...",  // e.g. "Your answer..."
  submit: "...",  // e.g. "Continue"
  back: "...",  // e.g. "Start over"
}
```

---

### Tests

**Given** `backend/tests/test_triage_service.py`
**When** this story is implemented
**Then** new unit tests cover:
1. When LLM returns `follow_up_question` and `follow_up_count=0`: service returns `FollowUpResponse`, no queue entry written
2. When LLM returns `follow_up_question` and `follow_up_count >= MAX_FOLLOW_UP_QUESTIONS`: service returns `TriageResponse` (follow-up path bypassed)
3. When `conversation_context` is non-empty: the enriched symptoms string passed to `llm_classify` contains the original symptoms plus the context block
4. Existing fallback tier tests continue to pass unchanged

---

## Out of Scope (v2)

- Curated question bank (LLM picks from pre-defined questions)
- Visible confidence indicator in the UI
- Persisting conversation context across sessions

---

## Files Touched

**Backend:**
- `backend/app/schemas/triage.py` — add `FollowUpResponse`, extend `TriageRequest`
- `backend/app/core/config.py` — add `MAX_FOLLOW_UP_QUESTIONS`
- `backend/app/services/llm_service.py` — new prompt template, extend `classify` signature and `_parse_response`
- `backend/app/services/triage_service.py` — extend `classify` with follow-up loop logic
- `backend/app/routers/triage.py` — pass new fields, update `response_model`
- `backend/tests/test_triage_service.py` — new tests

**Frontend:**
- `frontend/app/lib/types.ts` — add `FollowUpResponse`, extend `TriageRequest`
- `frontend/app/lib/api.ts` — extend `submitTriage`
- `frontend/app/components/TriageForm.tsx` — follow-up state machine
- `frontend/app/lib/translations.ts` — add `followUp` keys
