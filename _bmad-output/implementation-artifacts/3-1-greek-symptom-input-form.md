# Story 3.1: Greek Symptom Input Form

Status: done

## Story

As a patient,
I want a Greek-language symptom input form at the root route,
so that I can describe my symptoms in Greek and submit them for triage without needing medical knowledge.

## Acceptance Criteria

1. **Given** the Next.js frontend is running and `NEXT_PUBLIC_API_URL` is set
   **When** a patient navigates to `/`
   **Then** `frontend/app/page.tsx` renders `TriageForm.tsx` with all UI labels in Greek — no English text visible to the patient (NFR9)

2. **And** the form contains a textarea for free-text symptom input with a Greek placeholder (e.g., *"Περιγράψτε τα συμπτώματά σας..."*) and a submit button labelled in Greek

3. **And** on submit, the form calls `POST /api/v1/triage` via `frontend/app/lib/api.ts` with `{ symptoms, patient_id }` where `patient_id` is a client-generated anonymous UUID

4. **And** while the request is in flight, the submit button is disabled and a loading indicator is shown — the patient cannot submit twice (local `isLoading` state via `useState`, not global state)

5. **And** if the API call fails (network error or non-200 response), an inline error message is displayed in Greek without crashing the page

6. **And** on success, the triage response is passed to the results view (Story 3.2 component)

7. **And** all API calls use the `fetch` API via `frontend/app/lib/api.ts` — no Axios or React Query

8. **And** all imports in frontend TypeScript files use the `@/` prefix — no relative imports

9. **And** the page initial load completes in < 3 seconds on the demo machine (NFR3)

## Tasks / Subtasks

- [x] Create `frontend/app/lib/types.ts` — shared TypeScript types (AC: #3, #6)
  - [x] Define `TriageRequest` interface: `symptoms: string`, `patient_id: string`
  - [x] Define `Doctor` interface: `name: string`, `specialty: string`, `availability: boolean`, `fallback_note: string | null`
  - [x] Define `TriageResponse` interface with all fields from backend schema: `mts_level`, `mts_label`, `specialty`, `doctor`, `reasoning`, `redirect_url`, `rag_used`
  - [x] Define `QueueEntry` interface: `patient_id`, `mts_level`, `specialty`, `timestamp`

- [x] Create `frontend/app/lib/api.ts` — fetch wrapper (AC: #3, #7)
  - [x] Read `NEXT_PUBLIC_API_URL` from `process.env.NEXT_PUBLIC_API_URL`; if not set, default to `http://localhost:8000`
  - [x] Export `submitTriage(symptoms: string, patientId: string): Promise<TriageResponse>`
  - [x] Use native `fetch` only — no Axios, no React Query
  - [x] Throw descriptive error on non-200 response (include status code in message)
  - [x] All imports use `@/` prefix (e.g., `import { TriageResponse } from "@/app/lib/types"`)

- [x] Create `frontend/app/components/TriageForm.tsx` — form component (AC: #1–5, #8)
  - [x] Props: `onResult: (result: TriageResponse) => void`
  - [x] Local state: `symptoms: string`, `isLoading: boolean`, `error: string | null` — all via `useState`
  - [x] Generate `patient_id` using `crypto.randomUUID()` — call once per submission, not per render
  - [x] Textarea: `placeholder="Περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία αναπνοής)..."`, minimum 4 rows, `required`
  - [x] Submit button: Greek label "Εκτίμηση Συμπτωμάτων", `disabled={isLoading}`
  - [x] Loading state: show "Ανάλυση σε εξέλιξη..." text when `isLoading`
  - [x] Error display: Greek inline message (e.g., "Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.") — no crash
  - [x] On success: call `onResult(data)`, reset form state
  - [x] All imports use `@/` prefix

- [x] Create `frontend/app/components/TriageResult.tsx` — STUB for Story 3.2 (AC: #6)
  - [x] Props: `result: TriageResponse`
  - [x] Render a minimal placeholder so page.tsx can compile: "Αποτέλεσμα φορτώνεται..." text
  - [x] Story 3.2 will replace the stub with the full results UI
  - [x] Import `TriageResponse` from `@/app/lib/types`

- [x] Create `frontend/app/components/Disclaimer.tsx` — STUB for Story 3.2 (AC: #6)
  - [x] Render a minimal Greek disclaimer placeholder
  - [x] Story 3.2 will implement the full above-the-fold disclaimer

- [x] Rewrite `frontend/app/page.tsx` — full replacement (AC: #1, #6, #8)
  - [x] `"use client"` directive at top
  - [x] Local state: `result: TriageResponse | null` via `useState`
  - [x] When `result` is null: render `<TriageForm onResult={setResult} />`
  - [x] When `result` is not null: render `<TriageResult result={result} />`
  - [x] All imports use `@/` prefix
  - [x] No inline business logic — page is only composition

- [x] Fix `frontend/app/layout.tsx` — language attribute (AC: #1, NFR9)
  - [x] Change `lang="en"` to `lang="el"` on the `<html>` tag
  - [x] Update `metadata.title` to `"MEDΩ - Σύστημα Τριάζ"` and `metadata.description` to `"Σύστημα τεχνητής νοημοσύνης για αξιολόγηση συμπτωμάτων"`

- [x] Create `frontend/.env.local` if not present (AC: #3, NFR3)
  - [x] Add `NEXT_PUBLIC_API_URL=http://localhost:8000` so the frontend can reach the backend
  - [x] Note: this file is gitignored; `.env.example` at repo root already documents this variable

### Review Findings

- [x] [Review][Patch] Submit handler allows rapid double-submit race [frontend/app/components/TriageForm.tsx:16]
- [x] [Review][Patch] Inline error path can show English/technical message to patient [frontend/app/components/TriageForm.tsx:25]
- [x] [Review][Patch] Empty `NEXT_PUBLIC_API_URL` value bypasses localhost fallback [frontend/app/lib/api.ts:3]

## Dev Notes

### CRITICAL: What Already Exists and What Is WRONG

**`frontend/app/page.tsx` already exists** but is a monolith with architecture violations that this story must fix:

```tsx
// CURRENT VIOLATIONS — DO NOT KEEP:
// 1. All logic inline — no TriageForm/TriageResult components
// 2. Hardcoded URL: fetch("http://localhost:8000/api/v1/triage", ...)
//    MUST use: process.env.NEXT_PUBLIC_API_URL
// 3. Missing patient_id in POST body: { symptoms } — patient_id never sent
// 4. Disclaimer in English at bottom (not above fold, not Greek)
// 5. Uses `any` type everywhere
// 6. No lib/api.ts module — API call inline in component
```

**`frontend/app/layout.tsx` violation:**
```tsx
// CURRENT (wrong):
<html lang="en" ...>
// MUST BE:
<html lang="el" ...>
```

**`frontend/app/dashboard/page.tsx` violations (DO NOT touch in this story):**
- Uses polling (`setInterval`) instead of SSE EventSource
- Wrong queue URL: `/api/v1/queue` (correct: `/api/v1/triage/queue`)
- Story 4.x will fix these

---

### Required: `frontend/app/lib/types.ts`

```typescript
export interface TriageRequest {
  symptoms: string
  patient_id: string
}

export interface Doctor {
  name: string
  specialty: string
  availability: boolean
  fallback_note: string | null
}

export interface TriageResponse {
  mts_level: number
  mts_label: string
  specialty: string
  doctor: Doctor
  reasoning: string
  redirect_url: string
  rag_used: boolean
}

export interface QueueEntry {
  patient_id: string
  mts_level: number
  specialty: string
  timestamp: string
}
```

**Key decisions:**
- `doctor` is required (not optional) — backend always provides one via fallback chain
- `redirect_url` is required — always present in all three backend fallback tiers
- `fallback_note` on `Doctor` is `string | null` — null on exact specialty match, string on GP fallback
- `rag_used` is `boolean` — used by Story 4 dashboard; include now
- `QueueEntry` is defined here so Story 4 can import from this file

---

### Required: `frontend/app/lib/api.ts`

```typescript
import { TriageResponse } from "@/app/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function submitTriage(
  symptoms: string,
  patientId: string
): Promise<TriageResponse> {
  const res = await fetch(`${API_BASE}/api/v1/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  })

  if (!res.ok) {
    throw new Error(`Αποτυχία αξιολόγησης (κωδικός ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}
```

**Key decisions:**
- `NEXT_PUBLIC_API_URL` is the single source of truth for the backend URL
- Error message is in Greek — frontend never shows raw status codes to patient
- Snake_case API field `patient_id` must be sent — backend `TriageRequest` requires it (non-optional `str`)
- No Axios — native `fetch` only (architecture mandate)
- `??` operator — falls back to localhost:8000 only if env var is missing

---

### Required: `frontend/app/components/TriageForm.tsx`

```tsx
"use client"

import { useState } from "react"
import { submitTriage } from "@/app/lib/api"
import { TriageResponse } from "@/app/lib/types"

interface TriageFormProps {
  onResult: (result: TriageResponse) => void
}

export default function TriageForm({ onResult }: TriageFormProps) {
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const patientId = crypto.randomUUID()

    try {
      const result = await submitTriage(symptoms, patientId)
      onResult(result)
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : "Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
          Συμπτώματα
        </label>
        <textarea
          id="symptoms"
          name="symptoms"
          rows={4}
          required
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
          placeholder="Περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία αναπνοής)..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Ανάλυση σε εξέλιξη..." : "Εκτίμηση Συμπτωμάτων"}
      </button>
    </form>
  )
}
```

**Key decisions:**
- `crypto.randomUUID()` — browser-native, no library needed, called per submission
- Props: `onResult` callback — parent (`page.tsx`) owns the result state
- Error is `string | null` (not `string`) — explicit null when no error
- `disabled={isLoading}` on both textarea and button — prevents double-submit
- `role="alert"` on error div — WCAG 2.1 live region requirement (NFR10)
- Error messages in Greek — no English exposed to patient
- No global state — only local `useState` hooks (architecture mandate)

---

### Required: `frontend/app/page.tsx` — Full Replacement

```tsx
"use client"

import { useState } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import { TriageResponse } from "@/app/lib/types"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900">
            MEDΩ
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Σύστημα αξιολόγησης συμπτωμάτων
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-md">
          {result === null ? (
            <TriageForm onResult={setResult} />
          ) : (
            <TriageResult result={result} />
          )}
        </div>
      </div>
    </main>
  )
}
```

**Key decisions:**
- `result === null` (explicit null check, not falsy) — handles the `TriageResponse | null` type correctly
- `<h1>` not `<h2>` — page landmark heading (accessibility)
- No logic in `page.tsx` — pure composition, delegates to components
- `main` element — semantic HTML (NFR10, WCAG)
- No English text visible to patient in this component

---

### Required: `frontend/app/components/TriageResult.tsx` — STUB

```tsx
import { TriageResponse } from "@/app/lib/types"

interface TriageResultProps {
  result: TriageResponse
}

export default function TriageResult({ result }: TriageResultProps) {
  return (
    <div className="text-gray-500 text-center py-8">
      Αποτέλεσμα φορτώνεται...
    </div>
  )
}
```

**This is a stub only.** Story 3.2 replaces this with the full results UI (MTS level, specialty, doctor, reasoning, disclaimer). Do NOT implement result display in this story.

---

### Required: `frontend/app/components/Disclaimer.tsx` — STUB

```tsx
export default function Disclaimer() {
  return null
}
```

Story 3.2 implements the full above-the-fold medical disclaimer. Keep this as a null stub for now.

---

### Required: `frontend/app/layout.tsx` — Changes

Change `lang="en"` → `lang="el"` and update metadata:

```tsx
export const metadata: Metadata = {
  title: "MEDΩ - Σύστημα Τριάζ",
  description: "Σύστημα τεχνητής νοημοσύνης για αξιολόγηση συμπτωμάτων",
}
```

The `html` tag must have `lang="el"` for WCAG compliance and Greek screen readers (NFR10, NFR9).

---

### Architecture Compliance

**MUST follow:**
- All frontend imports use `@/` prefix — relative imports (`../../`) are forbidden
- API URL: always from `process.env.NEXT_PUBLIC_API_URL`, never hardcoded
- `patient_id` must be sent in every POST to `/api/v1/triage` — backend `TriageRequest` model requires it
- `fetch` only — no Axios, no React Query (architecture mandate)
- Loading state: `useState` per component — no global state library (architecture mandate)
- Business logic in `lib/api.ts`, not in components or `page.tsx`
- `lang="el"` on `<html>` in `layout.tsx` — accessibility and NFR9

**Anti-patterns — explicitly forbidden:**
- ✗ Hardcoding `http://localhost:8000` directly in components
- ✗ Relative imports (`../`, `../../`) in any `.tsx`/`.ts` file
- ✗ Using `axios` or `react-query` (not installed, architecture violation)
- ✗ Business logic in `page.tsx` (call `submitTriage` in `TriageForm`, not `page.tsx`)
- ✗ Global state for `isLoading` (local `useState` only)
- ✗ Omitting `patient_id` from the POST body
- ✗ Error messages in English (NFR9 — patient sees only Greek)
- ✗ Implementing results display in Story 3.1 (that's Story 3.2)
- ✗ Using `any` type — use the types from `@/app/lib/types`

---

### Next.js Version Warning

The project uses **Next.js 16.2.4** (not 15). This is a newer version than what was present at training cutoff. The `frontend/AGENTS.md` says:

> "This is NOT the Next.js you know. APIs, conventions, and file structure may all differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

**Safe assumptions (confirmed from existing code):**
- App Router is used (`app/` directory, not `pages/`)
- `"use client"` directive required for components using hooks
- `layout.tsx` and `page.tsx` conventions are present
- Tailwind CSS v4 is configured (postcss-based, different from v3)

**Tailwind CSS v4 note:** The project uses `@tailwindcss/postcss` (v4). Class names are the same as v3, but configuration is via CSS imports (`@import "tailwindcss"`) not `tailwind.config.js`. Use standard utility classes — they work identically.

---

### `patient_id` Generation

Use `crypto.randomUUID()` — available natively in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+). Do NOT import `uuid` package (not installed).

```typescript
const patientId = crypto.randomUUID()
// Returns: "550e8400-e29b-41d4-a716-446655440000" format
```

Call this inside `handleSubmit`, not at component render time. A new UUID per submission is correct behavior.

---

### DO NOT TOUCH These Files

- `frontend/app/dashboard/page.tsx` — Story 4.x refactors this (polling → SSE, URL fix)
- `frontend/app/globals.css` — no changes needed
- `frontend/next.config.ts` — no changes needed
- `frontend/tsconfig.json` — `@/` path alias already configured

---

### Testing & Verification

```bash
cd frontend

# Start dev server
npm run dev

# Verify:
# 1. Navigate to http://localhost:3000
# 2. All labels in Greek, no English text visible
# 3. Enter symptoms and submit — button disables, "Ανάλυση σε εξέλιξη..." shown
# 4. On success: stub TriageResult renders "Αποτέλεσμα φορτώνεται..."
# 5. On network error: Greek error message inline
# 6. Double-submit prevented (button stays disabled during request)

# TypeScript check
npx tsc --noEmit

# Check env var is being read (not hardcoded)
grep -r "localhost:8000" app/  # Should return NO results after refactor
grep -r "NEXT_PUBLIC_API_URL" app/lib/api.ts  # Must exist here
```

**Manual API verification (backend must be running):**
```bash
# Verify the POST body includes patient_id
# Open browser dev tools → Network tab → submit form
# Request payload must be: { "symptoms": "...", "patient_id": "uuid-..." }
# (Previously the old page.tsx never sent patient_id — confirm it's now sent)
```

---

### Previous Story Intelligence (Epic 2 Learnings)

- **`doctor.fallback_note`** is `null` on exact specialty match, non-null string on GP fallback. Type it as `string | null` (not `string | undefined`) to match backend `model_dump()` output.
- **`rag_used: bool = True`** — always present in response. Story 4 dashboard may display this. Include in `TriageResponse` type.
- **Backend never returns HTTP 500** on `/api/v1/triage` — the three-tier fallback chain always returns 200. Frontend error handling only needs to handle network failures and non-200 responses from other causes.
- **`redirect_url`** uses percent-encoded Greek characters (e.g., `%CE%9A%CE%B1%CF%81%CE%B4%CE%B9%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1`). The `TriageResponse.redirect_url` is a ready-to-use string — no additional encoding needed in frontend.

---

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` § Story 3.1; § Epic 3 overview; § FR1, NFR3, NFR9, NFR10
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Frontend Architecture; § Naming Patterns; § Anti-Patterns; § Project Structure (`frontend/app/components/`, `frontend/app/lib/`)
- Story 2.5: `_bmad-output/implementation-artifacts/2-5-post-api-v1-triage-endpoint.md` § TriageResponse schema; doctor.fallback_note behavior

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

Implemented all 8 tasks for Story 3.1:
- Created `frontend/app/lib/types.ts` with `TriageRequest`, `Doctor`, `TriageResponse`, `QueueEntry` interfaces — all typed, no `any`
- Created `frontend/app/lib/api.ts` with `submitTriage()` using native `fetch` and `NEXT_PUBLIC_API_URL` env var; sends `patient_id` in POST body; Greek error messages
- Created `frontend/app/components/TriageForm.tsx` with local `useState` only, `crypto.randomUUID()` per submission, Greek labels throughout, `role="alert"` on error, `disabled={isLoading}` on both textarea and button
- Created `frontend/app/components/TriageResult.tsx` as minimal stub rendering "Αποτέλεσμα φορτώνεται..." (Story 3.2 replaces)
- Created `frontend/app/components/Disclaimer.tsx` as null stub (Story 3.2 replaces)
- Rewrote `frontend/app/page.tsx` as pure composition with `result === null` explicit check; no inline business logic
- Fixed `frontend/app/layout.tsx`: `lang="el"`, updated metadata title/description in Greek
- Created `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
- TypeScript check: ✅ no errors
- Production build: ✅ compiled successfully

### File List

- frontend/app/lib/types.ts (created)
- frontend/app/lib/api.ts (created)
- frontend/app/components/TriageForm.tsx (created)
- frontend/app/components/TriageResult.tsx (created)
- frontend/app/components/Disclaimer.tsx (created)
- frontend/app/page.tsx (rewritten)
- frontend/app/layout.tsx (modified)
- frontend/.env.local (created)

### Change Log

- 2026-04-17: Story 3.1 implemented — Greek symptom input form with clean architecture (lib/types.ts, lib/api.ts, components/TriageForm.tsx, stubs for TriageResult/Disclaimer, page.tsx rewrite, layout.tsx lang fix, .env.local)
