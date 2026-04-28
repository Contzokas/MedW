---
stepsCompleted: [1, 2, 3]
session_topic: Adaptive follow-up question system for MedW triage flow
session_goals: Explore implementation approaches for LLM confidence-triggered follow-up questions before triage
selected_approach: ai-recommended
techniques_used: ['What If Scenarios']
ideas_generated: 4
---

## Session Overview

**Topic:** Adaptive follow-up question system — LLM detects insufficient symptoms or low confidence, then asks targeted questions before producing a triage result
**Goals:** Generate ideas for UX flow, backend logic, LLM prompting strategy, confidence detection mechanics
**Date:** 2026-04-28

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Technique Used:** What If Scenarios (creative)

---

## Session Harvest — Follow-Up Questions Feature

**[Confidence #1]: Hidden Confidence Trigger**
_Concept_: LLM internally scores confidence on the first triage call. Below threshold → follow-up question returned instead of triage result. Patient never sees uncertainty signals — experience feels like natural conversation.
_Novelty_: No UI change needed. No alarming "I'm not sure" indicators in a medical context.

**[Flow #2]: Second LLM Call Loop**
_Concept_: Same model, different prompt. Response is parsed — either a triage result OR a follow-up question. Loop controlled by a configurable `follow_up_count` max value. When max is reached, triage is forced regardless of confidence.
_Novelty_: Zero new infrastructure — pure prompt engineering + a counter. Existing triage pipeline unchanged.

**[Input #3]: Concatenated Context String**
_Concept_: Each Q&A pair appended to the original symptoms string before the next LLM call. No special conversation history format or schema changes required.
_Novelty_: Existing triage pipeline receives richer input but is otherwise untouched.

**[Fallback #4]: Always Triage at Max**
_Concept_: When `follow_up_count >= max`, force a triage result regardless of confidence. Patient always receives an answer.
_Novelty_: Prevents patients from ever being stuck in a loop with no result — critical for a medical context.

---

## Key Decisions

- Follow-up trigger: hidden (patient unaware of confidence scoring)
- Question generation: LLM-generated on the fly (curated question bank deferred to v2)
- Max questions: configurable value (not hardcoded)
- Fallback: always produce a triage result at max, never return "cannot assess"
- Input format: concatenated symptoms + Q&A string passed to existing triage endpoint
