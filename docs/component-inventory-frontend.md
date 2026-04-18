# Component Inventory — Frontend

> Generated: 2026-04-18 | Part: `frontend` | Framework: Next.js 16 / React 19

---

## Overview

8 React components across 2 routes. All components use Tailwind CSS v4. UI language is Greek throughout.

---

## Shared Components (`app/components/`)

### `TriageForm`

**File:** `app/components/TriageForm.tsx`
**Type:** Client component (`"use client"`)

Patient-facing symptom input form. Manages local form state and submits to the triage API.

| Prop | Type | Description |
|---|---|---|
| `onResult` | `(result: TriageResponse) => void` | Callback when triage result is received |

**Behaviour:**
- Renders a `<textarea>` for Greek symptom input
- Generates `patient_id` via `crypto.randomUUID()` on submit
- Calls `submitTriage(symptoms, patientId)` from `lib/api.ts`
- Shows Greek error message on failure
- Disables input and button during loading
- Passes result up to parent via `onResult` callback

**State:**
- `symptoms: string`
- `isLoading: boolean`
- `error: string | null`

---

### `TriageResult`

**File:** `app/components/TriageResult.tsx`
**Type:** Server component (no client hooks)

Displays the triage result after a successful submission.

| Prop | Type | Description |
|---|---|---|
| `result` | `TriageResponse` | Full triage response from the API |

**Renders:**
1. `<Disclaimer />` — always shown first
2. MTS level badge (color-coded circle, 1–5)
3. MTS label text (Greek)
4. Recommended specialty (Greek name)
5. `<DoctorCard />` with doctor info and redirect link
6. Reasoning text (Greek, from LLM)

**MTS color mapping:**

| Level | Class |
|---|---|
| 1–2 | `bg-red-600 text-white` |
| 3 | `bg-orange-500 text-white` |
| 4–5 | `bg-green-600 text-white` |

---

### `DoctorCard`

**File:** `app/components/DoctorCard.tsx`
**Type:** Server component

Displays a matched doctor's details and a link to finddoctors.gov.gr.

| Prop | Type | Description |
|---|---|---|
| `doctor` | `Doctor` | Doctor data (name, specialty, availability, fallback_note) |
| `redirectUrl` | `string` | URL to finddoctors.gov.gr search for this doctor/specialty |

**Renders:**
- Doctor name and specialty
- `fallback_note` (amber warning text) if non-null (GP fallback used)
- External link to `finddoctors.gov.gr` (opens in new tab, `rel="noopener noreferrer"`)

---

### `Disclaimer`

**File:** `app/components/Disclaimer.tsx`
**Type:** Server component (no props)

Medical disclaimer shown on every triage result. ARIA-labelled for accessibility.

**Content:** Greek text noting MEDΩ is an AI tool, not a clinical diagnosis; directs to ΕΚΑΒ 166 for emergencies.

---

## Dashboard Components (`app/dashboard/components/`)

### `TriageQueue`

**File:** `app/dashboard/components/TriageQueue.tsx`
**Type:** Client component (`"use client"`)

Real-time triage queue table for the nurse dashboard. Consumes the SSE stream.

**No props.**

**Behaviour:**
- Calls `useTriageStream()` hook — connects to `GET /api/v1/triage/queue` SSE endpoint
- Renders a `<table>` with columns: Time, Patient ID, MTS Level, Specialty
- Shows empty-state message when queue is empty
- New entries prepend to the top (newest first)

---

### `TriageQueueItem`

**File:** `app/dashboard/components/TriageQueueItem.tsx`
**Type:** Server component

A single row in the triage queue table.

| Prop | Type | Description |
|---|---|---|
| `entry` | `QueueEntry` | Queue entry data |

**Renders:**
- Local time (`toLocaleTimeString("el-GR")`)
- Truncated patient ID (first 8 chars + `...`)
- MTS level badge (Greek label, same color coding as `TriageResult`)
- Specialty (Greek)
- Row background: `bg-red-50` for MTS ≤ 2, `bg-white` otherwise

**MTS Greek labels:**

| Level | Greek Label |
|---|---|
| 1 | Άμεση Αντιμετώπιση |
| 2 | Πολύ Επείγον |
| 3 | Επείγον |
| 4 | Λιγότερο Επείγον |
| 5 | Μη Επείγον |

---

## Pages

### `app/page.tsx` — Patient Triage Page (`/`)

**Type:** Client component (`"use client"`)

Root patient interface. Manages state toggle between form and result.

**State:** `result: TriageResponse | null`

**Conditional render:**
- `result === null` → `<TriageForm onResult={setResult} />`
- `result !== null` → `<TriageResult result={result} />`

**Persistent UI:**
- Clickable `MEDΩ` heading resets `result` to `null` (back to form)
- Emergency banner: `166` (ΕΚΑΒ) always visible at bottom

---

### `app/dashboard/page.tsx` — Nurse Dashboard (`/dashboard`)

**Type:** Server component

Simple layout wrapper for the nurse dashboard.

**Renders:** `<h1>` + `<TriageQueue />`

---

## Lib (not components)

### `lib/api.ts`

`submitTriage(symptoms, patientId)` — fetch wrapper for `POST /api/v1/triage`.

### `lib/types.ts`

TypeScript interfaces mirroring backend Pydantic schemas: `TriageRequest`, `TriageResponse`, `Doctor`, `QueueEntry`.

### `lib/useTriageStream.ts`

`useTriageStream(): QueueEntry[]` — custom React hook. Manages `EventSource` lifecycle, validates incoming JSON with type guard, deduplicates entries.
