---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: ['project_prompt.md']
workflowType: 'prd'
classification:
  projectType: web_app + api_backend
  domain: healthcare
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document — MEDΩ

**Author:** Yoko
**Date:** 2026-04-15
**Project:** MedW — AI-powered medical triage assistant for the Greek National Health System (ΕΣΥ)
**Context:** Kiefer AI Open Hackathon 2026 | Demo deadline: 21 April 2026 | Prize: €10,000

---

## Executive Summary

MEDΩ addresses a structural inefficiency in ΕΣΥ: ~7 million annual appointments where patients present to the wrong specialty due to lack of clinical guidance. Patients describe symptoms in Greek and receive an instant Manchester Triage System classification (levels 1–5), a recommended medical specialty, and a matched doctor recommendation. Nurses monitor submissions via a live dashboard. The MVP uses synthetic and anonymized data (Synthea + MIMIC-IV) with a simulated redirect to finddoctors.gov.gr.

**What Makes This Special:** Standard triage tools stop at urgency classification. MEDΩ goes further — AI-powered symptom analysis enables precision doctor matching, routing patients to the most fitting physician for their specific presentation. This transforms triage from a safety gate into an active care-routing engine, reducing wrong-specialty visits, ED overcrowding, and wasted clinical resources.

**Stack:** BioMistral-7B via Ollama + LangChain/ChromaDB (RAG) + FastAPI + Next.js/React + Docker + NVIDIA B200
**Constraints:** On-premise inference only (GDPR Article 9); no fine-tuning; prompt engineering + RAG only

---

## Success Criteria

### User Success

- **Patient:** Receives MTS level, recommended specialty, and suggested doctor within a single form interaction — no dead ends, reasoning visible
- **Nurse:** Live dashboard displays incoming triage submissions in real time without page refresh
- **Trust signal:** Every result includes AI reasoning text explaining the classification

### Business Success

- Demo-ready MVP delivered by **21 April 2026**
- Proposal document complete and submission-ready for €10,000 prize evaluation
- Public GitHub repository with README, setup instructions, Apache 2.0 license
- Live demo runs without failure during 27–30 April hackathon

### Technical Success

- MTS classification accuracy **≥ 80%** on Synthea/MIMIC-IV test cases
- All inference on-premise — zero external API calls for patient data
- Triage response < 10 seconds with Ollama pre-warmed
- RAG pipeline correctly augments LLM inference with clinical context

### Measurable Outcomes

| Metric | Target |
|---|---|
| MTS classification accuracy | ≥ 80% on test dataset |
| Triage response time | < 10 seconds (demo, pre-warmed) |
| Dashboard update latency | < 2 seconds |
| Frontend initial load | < 3 seconds |
| Demo uptime | 100% during live presentation |
| Documentation | Proposal + README + API docs submitted |

---

## Product Scope

### Phase 1 — MVP (Hackathon)

**MVP Approach:** Demo MVP — end-to-end working prototype optimised for a convincing live demonstration and strong proposal document. Scope minimised for reliability under 6-day time pressure.

**Must-Have Capabilities:**
- Greek symptom input form (`/` route, Next.js)
- `POST /api/v1/triage` → BioMistral + RAG → MTS level + specialty + doctor + reasoning
- Mocked doctor dataset (static JSON fixture)
- Medical disclaimer on every results screen (drafted by Stella)
- Simulated finddoctors.gov.gr redirect
- Nurse dashboard (`/dashboard` route) — read-only live triage queue
- Docker Compose deployment: frontend + backend + ollama + chromadb
- Public GitHub repo: README, Apache 2.0
- Submission-ready proposal document

**Explicitly Out of Scope for MVP:**
- Real patient data
- Live finddoctors.gov.gr API integration
- Authentication / access control
- Nurse confirm/override actions
- Fallback doctor matching (nice-to-have if time allows)

### Phase 2 — Post-Hackathon

- Live finddoctors.gov.gr booking integration
- Real GDPR-compliant patient data pipeline
- Nurse confirm/override actions with audit trail
- Triage analytics for hospital administrators
- Feedback loop: nurse corrections feed future classification improvement

### Phase 3 — Expansion

- Full ΕΣΥ multi-hospital integration
- Mobile patient interface
- Continuous model improvement via validated clinical feedback
- Real-time ED capacity routing

---

## User Journeys

### Journey 1: Dimitris — The Confused Patient (Primary — Happy Path)

Dimitris, 52, wakes with chest tightness and mild shortness of breath. He doesn't know if this is cardiac, pulmonary, or anxiety. He opens MEDΩ on his phone.

**Opening:** Anxious, unsure whether to go to the ER or book an appointment. He types in Greek — *"πόνος στο στήθος, δυσκολία στην αναπνοή, ζαλάδα"*.

**Rising Action:** MEDΩ processes his input through BioMistral + RAG. Within seconds: MTS Level 2 (Urgent), Cardiology, Dr. Παπαδόπουλος — Cardiologist, available today. Reasoning shown: *"Symptoms indicate possible cardiac event — urgent cardiology evaluation recommended."*

**Climax:** He sees not just a category but a specific doctor to go to. Uncertainty dissolves — he has a clear action.

**Resolution:** He clicks the simulated finddoctors.gov.gr link and sees the redirect destination.

*Requirements revealed: FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR13, FR14*

---

### Journey 2: Eleni — The Worried Parent (Primary — Edge Case)

Eleni, 34, enters symptoms for her 6-year-old: *"πυρετός, εξάνθημα, κόπωση"* (fever, rash, fatigue). System returns MTS Level 3 (Urgent), specialty: Pediatric Dermatology.

**Edge case:** No pediatric specialist in the mocked dataset. MEDΩ falls back to General Pediatrician and explains why.

**Resolution:** Eleni trusts the recommendation because the reasoning is visible. No blank screen, no error.

*Requirements revealed: FR9, FR15, FR16, FR17*

---

### Journey 3: Nurse Stavroula — The Dashboard Monitor (Secondary)

Stavroula opens the nurse dashboard on shift. She sees a live queue: patient ID, MTS level, specialty, timestamp. During the demo, judges watch her screen populate in real time as a patient submits symptoms.

**Resolution:** The dashboard makes the AI's work visible and auditable — the "proof it works" view for evaluators.

*Requirements revealed: FR10, FR11, FR12*

---

### Journey 4: The Hackathon Judge (Demo-Specific)

A non-technical evaluator watches the live demo: patient form → Greek symptom entry → triage result with reasoning → doctor match → simulated redirect. Clean, fast, no errors. The proposal document explains the architecture and the €10,000 ask.

**Resolution:** They understand the value in 90 seconds without reading code.

*Requirements revealed: FR6, FR18, FR19, FR22, FR23; NFR1, NFR9, NFR11, NFR12*

---

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR Article 9** — medical data is special category; all inference on-premise, zero external API calls for patient data
- **Synthetic data only in MVP** — Synthea + MIMIC-IV sidesteps GDPR exposure during hackathon scope
- **Medical liability disclaimer** — system must identify itself as a triage aid, not a clinical diagnosis; Stella (medical expert) drafts and owns this text; displayed on every results screen
- **MTS fidelity** — classifications must follow the Manchester Triage System clinical standard; intentional deviations documented

### Technical Constraints

- **On-premise only** — BioMistral via Ollama, ChromaDB local; no cloud inference
- **No fine-tuning** — prompt engineering + RAG only
- **Data containment** — patient input not transmitted outside the deployment environment, including logs
- **Greek language risk** — BioMistral-7B multilingual capacity for Greek medical terminology is an open risk; must be validated in the first development sprint

### Integration

- **finddoctors.gov.gr** — simulated redirect only; no live API for MVP
- **Mocked doctor dataset** — static JSON fixture; schema: `{ name, specialty, availability }`

### Domain Risk Register

| Risk | Mitigation |
|---|---|
| BioMistral accuracy below 80% in Greek | Test in sprint 1; fallback: translate to English for inference, return Greek result |
| MTS misclassification during live demo | Use pre-validated symptom scenarios only during demo |
| Latency > 10s during demo | Pre-warm Ollama; test on B200 before demo day |
| Missing medical disclaimer | Stella owns text; blocked until delivered; required before demo |

---

## Innovation & Novel Patterns

### Innovation Areas

- **LLM-powered clinical triage at national scale** — BioMistral-7B applied to MTS within ΕΣΥ; no equivalent exists in the Greek public health system today
- **Precision doctor matching** — moves beyond specialty routing to patient-specific physician recommendations based on symptom profile and availability
- **RAG-only on-premise medical AI** — demonstrates ≥80% MTS accuracy using prompt engineering + RAG on a 7B model without fine-tuning, on NVIDIA B200 infrastructure

### Competitive Landscape

- Existing triage tools (ESI, paper MTS, basic symptom checkers) are rule-based and specialty-level only
- Commercial AI triage (Babylon Health, Ada) require cloud APIs — incompatible with GDPR Article 9 on-premise mandate
- MEDΩ's open-source, on-premise stack (Apache 2.0) is directly replicable by EU public health systems with the same constraints

### Innovation Risk Register

| Risk | Fallback |
|---|---|
| BioMistral underperforms on Greek medical text | English inference pipeline with Greek result output |
| RAG retrieval misses relevant clinical context | Expand ChromaDB corpus; tune chunk size and retrieval k |
| Doctor matching insufficient for demo credibility | Scope to specialty matching; label precision matching as post-MVP roadmap |

---

## Web App + API Requirements

### Architecture Overview

MEDΩ is a Next.js SPA (two routes) backed by a FastAPI REST API, deployed as separate Docker containers on an internal network. All inference is on-premise.

| Concern | Decision |
|---|---|
| Patient route | `/` — symptom input form, triage result |
| Nurse route | `/dashboard` — read-only live triage queue |
| Backend | FastAPI, `/api/v1` prefix, internal network only |
| Real-time | WebSocket or SSE for dashboard updates |
| Authentication | None — open access, demo environment only |
| SEO | Not required |
| Accessibility | WCAG 2.1 AA best-effort, Greek UI |

### API Contract

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/triage` | Symptoms → MTS level + specialty + doctor + reasoning |
| `GET` | `/api/v1/doctors` | Mocked doctor list, filterable by specialty |
| `GET` | `/api/v1/triage/queue` | Live triage submissions (dashboard feed) |
| `GET` | `/api/v1/health` | Service readiness check |

**`POST /api/v1/triage` request:**
```json
{ "symptoms": "string (Greek)", "patient_id": "string (anonymous)" }
```

**Response:**
```json
{
  "mts_level": 1-5,
  "mts_label": "Immediate | Very Urgent | Urgent | Less Urgent | Non-urgent",
  "specialty": "string",
  "doctor": { "name": "string", "specialty": "string" },
  "reasoning": "string",
  "redirect_url": "string (simulated)"
}
```

### Deployment

- Docker Compose services: `frontend`, `backend`, `ollama`, `chromadb`
- Frontend → backend via `NEXT_PUBLIC_API_URL` environment variable
- Ollama model pre-loaded at container startup
- Mocked doctor dataset loaded as static JSON fixture at backend startup

---

## Functional Requirements

### Symptom Triage

- **FR1:** Patient can submit a free-text symptom description in Greek
- **FR2:** System can classify submitted symptoms into an MTS urgency level (1–5)
- **FR3:** System can recommend a medical specialty based on symptom classification
- **FR4:** System can match a specific doctor from the mocked dataset to the patient's symptom profile and recommended specialty
- **FR5:** System can generate a human-readable reasoning explanation for every triage result
- **FR6:** System can display a medical disclaimer on every result screen identifying itself as a triage aid, not a clinical diagnosis

### Patient Results & Routing

- **FR7:** Patient can view MTS level, specialty, recommended doctor, and reasoning in a single result screen
- **FR8:** Patient can follow a simulated redirect to finddoctors.gov.gr scoped to their recommended specialty and doctor
- **FR9:** System can present an alternative doctor recommendation when no exact specialty match exists in the dataset

### Nurse Dashboard

- **FR10:** Nurse can view a live queue of all triage submissions in real time
- **FR11:** Nurse can see per-submission details: patient ID, MTS level, recommended specialty, timestamp
- **FR12:** System pushes new triage entries to the dashboard without requiring page refresh

### AI & Knowledge Pipeline

- **FR13:** System can process Greek-language symptom text through BioMistral-7B for MTS classification
- **FR14:** System can augment LLM inference with clinical context retrieved from a local ChromaDB knowledge base
- **FR15:** System returns a triage result using base LLM knowledge when RAG retrieval returns low-confidence results

### Doctor Dataset

- **FR16:** System can serve a mocked doctor list filterable by specialty
- **FR17:** System can match a doctor to a triage result based on specialty alignment and mocked availability

### System & Operations

- **FR18:** System can be deployed as a containerised stack via Docker Compose on NVIDIA GPU infrastructure
- **FR19:** System can confirm operational readiness via a health check endpoint
- **FR20:** System processes all patient input without transmitting data outside the local deployment environment
- **FR21:** Operator can pre-load the LLM at container startup to eliminate cold-start latency

### Documentation & Deliverables

- **FR22:** Team can produce a submission-ready proposal document covering system description, architecture, and value proposition
- **FR23:** Team can maintain a public GitHub repository with README, setup instructions, and Apache 2.0 license

---

## Non-Functional Requirements

### Performance

- **NFR1:** Triage response (symptom submission → full result displayed) completes in < 10 seconds with Ollama pre-warmed, measured end-to-end on demo hardware
- **NFR2:** Nurse dashboard reflects new submissions within 2 seconds of POST request completion
- **NFR3:** Frontend initial load completes in < 3 seconds on the demo machine
- **NFR4:** Ollama model load at container startup completes before the first request is accepted; cold-start during a live demo is a critical failure

### Security & Privacy

- **NFR5:** Zero patient symptom data transmitted to external services — verified by network isolation in Docker Compose configuration
- **NFR6:** Patient input not persisted beyond the active session except as entries in the local triage queue
- **NFR7:** Deployment exposes only ports required for the demo interface; no public-facing admin or inference endpoints
- **NFR8:** No credentials, API keys, or sensitive configuration committed to the public GitHub repository

### Accessibility

- **NFR9:** Patient-facing UI rendered in Greek with plain-language labels requiring no medical knowledge to interpret
- **NFR10:** UI meets WCAG 2.1 AA best-effort: sufficient colour contrast (≥ 4.5:1), keyboard navigability, minimum 16px body font
- **NFR11:** Medical disclaimer visually prominent (above the fold) on every triage result screen, written in plain Greek

### Reliability

- **NFR12:** System completes a full demo run (symptom input → result → dashboard update) without failure; validated by pre-demo rehearsal on target hardware
- **NFR13:** System returns a triage result using base LLM knowledge when RAG retrieval fails — no blank or error screen presented to the patient
