---
title: 'Uncertain Result Fallback at Max Follow-Up Questions'
type: 'feature'
created: '2026-04-29'
status: 'in-review'
context: []
baseline_commit: 'd6582a515e4cfae63ceed6c23cf9466e7de041f3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When the AI reaches the maximum number of follow-up questions but is still uncertain about the symptoms, it currently forces a triage result regardless of confidence. This can lead to inaccurate medical recommendations when the AI genuinely lacks sufficient information.

**Approach:** Replace the forced triage behavior with an uncertain result response. When at max follow-ups and still uncertain, the AI returns a message explaining it cannot provide a valid result with those symptoms and suggests consulting a doctor, along with an option to start over.

## Boundaries & Constraints

**Always:**
- At max follow-up count, AI must either return a valid triage OR an uncertain result — no forced low-confidence results
- Uncertain results must NOT write to the triage queue or history (handled like follow-up responses)
- Frontend must provide a "start over" option when displaying uncertain results
- Uncertain message must be localized (Greek/English)
- Existing fallback chain (RAG → base LLM → safe default) must wrap the new logic unchanged

**Ask First:** None

**Never:**
- Do not add forced confidence thresholds or scoring systems
- Do not modify the max follow-up count configuration
- Do not persist uncertain results to database or queue
- Do not remove or alter the existing redirect-to-wizard functionality

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Valid symptoms, max follow-ups reached, AI uncertain | UncertainResultResponse with localized message, no queue entry | N/A |
| CONFIDENT_RESULT | Valid symptoms, max follow-ups reached, AI confident | Standard TriageResponse with queue entry | N/A |
| VAGUE_AT_MAX | Extremely vague symptoms at max follow-ups | RedirectToWizardResponse (existing behavior) | N/A |
| EARLY_UNCERTAIN | Symptoms insufficient, follow-ups remaining | FollowUpResponse (existing behavior) | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/schemas/triage.py` -- Define new UncertainResultResponse model
- `backend/app/services/llm_service.py` -- Add uncertain result option to prompt and response parsing
- `backend/app/services/triage_service.py` -- Handle uncertain result response (no queue/history)
- `frontend/app/lib/types.ts` -- Define UncertainResultResponse interface
- `frontend/app/components/TriageForm.tsx` -- Display uncertain result with start over option
- `frontend/app/lib/api.ts` -- Update submitTriage return type
- `frontend/app/lib/translations.ts` -- Add localized messages for uncertain results

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/schemas/triage.py` -- Add UncertainResultResponse Pydantic model with type field and localized message -- Define response structure
- [x] `backend/app/services/llm_service.py` -- Extend _HUMAN_TEMPLATE_WITH_FOLLOWUP to allow uncertain result at max follow-ups -- Enable uncertain response option
- [x] `backend/app/services/llm_service.py` -- Extend _parse_response to detect and validate uncertain result responses -- Handle new response format
- [x] `backend/app/services/triage_service.py` -- Handle UncertainResultResponse, bypass queue/history like FollowUpResponse -- Ensure no persistence
- [x] `backend/app/routers/triage.py` -- Update response_model to include UncertainResultResponse -- Allow new response type
- [x] `frontend/app/lib/types.ts` -- Add UncertainResultResponse interface with type and message fields -- Type safety
- [x] `frontend/app/lib/api.ts` -- Update submitTriage return type to include UncertainResultResponse -- API compatibility
- [x] `frontend/app/lib/translations.ts` -- Add uncertainResult keys with Greek/English messages (title, message, startOver) -- Localization
- [x] `frontend/app/components/TriageForm.tsx` -- Display uncertain result with message and start over button -- UX implementation

**Acceptance Criteria:**
- Given patient has reached MAX_FOLLOW_UP_QUESTIONS and AI is uncertain, when triage is processed, then UncertainResultResponse is returned with appropriate localized message
- Given UncertainResultResponse is returned, when processed by triage service, then no queue entry or history record is written
- Given UncertainResultResponse is received by frontend, when displayed, then user sees the uncertain message and a "start over" button
- Given user clicks "start over" on uncertain result, when triggered, then form resets to initial state allowing new symptom input
- Given patient has not reached max follow-ups, when AI is uncertain, then FollowUpResponse is returned (existing behavior unchanged)
- Given patient reaches max follow-ups and AI is confident, when triage is processed, then standard TriageResponse is returned with queue entry (existing behavior unchanged)

## Spec Change Log

## Design Notes

**Why uncertain result instead of forced triage:**
Medical triage accuracy is critical. Forcing a result when the AI lacks confidence can lead to inappropriate recommendations. The uncertain result acknowledges system limitations while still being helpful by directing users to professional care.

**Why no queue/history for uncertain results:**
Uncertain results are not actual triage outcomes — they're system acknowledgments of insufficient information. Writing them to the queue would pollute triage analytics with non-decisions.

**Message design examples:**
- English: "I don't have enough information to provide a reliable triage result with these symptoms. Please consult a doctor for accurate assessment."
- Greek: "Δεν έχω αρκετές πληροφορίες για να παρέχω μια αξιόπιστη διάγνωση με αυτά τα συμπτώματα. Παρακαλώ συμβουλευτείτε έναν γιατρό για ακριβή εκτίμηση."

## Verification

**Commands:**
- `docker compose exec backend python -m pytest tests/test_triage_service.py -v` -- expected: All tests pass, including new uncertain result tests
- `docker compose logs backend | grep -i "uncertain\|queue\|history"` -- expected: Uncertain responses logged, no queue/history entries for them

**Manual checks:**
- Start application and trigger uncertain result by providing very vague symptoms repeatedly
- Verify frontend displays uncertain message with start over button
- Verify clicking start over resets the form properly
- Verify confident results at max follow-ups still work normally
- Verify queue and history don't contain entries for uncertain results