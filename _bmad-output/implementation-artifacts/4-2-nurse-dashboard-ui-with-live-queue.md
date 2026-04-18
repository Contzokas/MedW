# Story 4.2: Nurse Dashboard UI with Live Queue

Status: done

## Story

As a nurse,
I want a live dashboard at `/dashboard` that automatically displays incoming triage submissions,
So that I can monitor patient triage activity in real time without refreshing the page.

## Acceptance Criteria

1. **Given** the SSE endpoint from Story 4.1 is running and `NEXT_PUBLIC_API_URL` is set  
   **When** a nurse navigates to `/dashboard`  
   **Then** `frontend/app/dashboard/page.tsx` renders `TriageQueue.tsx` which displays all existing queue entries on load

2. **And** `useTriageStream.ts` opens a native `EventSource` connection to `GET /api/v1/triage/queue` — no WebSocket library or custom reconnect logic is used (browser handles reconnect natively)

3. **And** when a new `triage_update` event is received, `TriageQueue.tsx` re-renders with the new entry **prepended to the top** of the list without any page refresh (FR12)

4. **And** each `TriageQueueItem.tsx` displays: anonymous patient ID (first 8 chars + "..."), MTS level with its Greek label, recommended specialty, and submission timestamp formatted in Greek locale (FR11)

5. **And** MTS level 1 and 2 items use a visually distinct colour treatment matching the patient results screen (`bg-red-600 text-white` — consistent with `TriageResult.tsx`)

6. **And** if the EventSource connection drops, the browser reconnects automatically — no custom retry logic exists in `useTriageStream.ts`

7. **And** the dashboard renders all labels in Greek — no English text visible to the nurse (NFR9)

8. **And** the dashboard is keyboard-navigable and meets WCAG 2.1 AA colour contrast requirements (NFR10)

9. **And** all frontend imports use `@/` prefix; `useTriageStream.ts` lives in `frontend/app/lib/`

10. **And** end-to-end verification: opening `/dashboard` in one browser tab and submitting symptoms in another tab causes a new queue entry to appear on the dashboard within 2 seconds (NFR2)

## Tasks / Subtasks

- [x] Create `frontend/app/lib/useTriageStream.ts` — EventSource hook (AC: #2, #3, #6)
  - [x] Open `EventSource` to `${NEXT_PUBLIC_API_URL}/api/v1/triage/queue`
  - [x] Listen for `triage_update` events; parse `JSON.parse(event.data)` as `QueueEntry`
  - [x] Prepend new entries via immutable `setEntries(prev => [entry, ...prev])`
  - [x] Initialise state with empty array; backlog entries stream in automatically on connect
  - [x] Return `cleanup` via `useEffect` return — call `es.close()` on unmount
  - [x] No `onreconnect`, no manual retry timers

- [x] Create `frontend/app/dashboard/components/TriageQueueItem.tsx` — single entry row (AC: #4, #5, #7, #8)
  - [x] Props: `entry: QueueEntry`
  - [x] Display: `entry.patient_id.slice(0, 8) + "..."`, MTS badge with Greek label, `entry.specialty`, `new Date(entry.timestamp).toLocaleTimeString("el-GR")`
  - [x] Use `MTS_COLORS` map identical to `TriageResult.tsx` for badge (levels 1–2 → `bg-red-600 text-white`)
  - [x] Add `aria-label` on MTS badge in Greek for WCAG compliance

- [x] Create `frontend/app/dashboard/components/TriageQueue.tsx` — live list (AC: #1, #3, #7)
  - [x] `"use client"` directive (uses hooks)
  - [x] Call `useTriageStream()` to get `entries: QueueEntry[]`
  - [x] If `entries.length === 0`: show "Η ουρά είναι άδεια. Δεν υπάρχουν νέα περιστατικά." (reuse existing empty-state copy)
  - [x] Map entries to `<TriageQueueItem>` — newest first (prepend strategy in hook ensures order)

- [x] Refactor `frontend/app/dashboard/page.tsx` (AC: #1, #7) — REPLACE existing polling implementation
  - [x] Remove `"use client"` (page itself doesn't need hooks after refactor; TriageQueue is client)
  - [x] Remove all polling logic (`setInterval`, `fetchQueue`, `fetch(…/triage/queue)`)
  - [x] Remove duplicate `API_BASE` declarations (lines 6 and 8 — TypeScript error)
  - [x] Import and render `<TriageQueue />` from `@/app/dashboard/components/TriageQueue`
  - [x] Keep heading text: "Πίνακας Ελέγχου Νοσηλευτών"

- [x] Add unit/integration tests (AC: all)
  - [x] Skipped — no test framework configured in frontend/package.json (per story Dev Notes: "Do NOT add a test framework as part of this story")

### Review Findings

- [x] [Review][Patch] Potential duplicate queue entries after EventSource reconnect replay [frontend/app/lib/useTriageStream.ts:14]
- [x] [Review][Patch] Unstable row keys can mis-associate items when new entries prepend [frontend/app/dashboard/components/TriageQueue.tsx:37]
- [x] [Review][Patch] Missing SSE payload validation can throw on malformed event data [frontend/app/lib/useTriageStream.ts:13]
- [x] [Review][Patch] Level-3 MTS badge contrast misses WCAG AA at rendered text size [frontend/app/dashboard/components/TriageQueueItem.tsx:38]

## Dev Notes

### CRITICAL: Existing `dashboard/page.tsx` Must Be Replaced — Not Extended

The current `frontend/app/dashboard/page.tsx` uses **polling via `setInterval`** (3s) and `fetch` to call `GET /api/v1/triage/queue`. That route is now an SSE stream (`StreamingResponse`) — calling it with plain `fetch` will hang indefinitely.

**It also has a TypeScript error:** `API_BASE` is declared twice (lines 6 and 8). This would fail `tsc`.

**Entire file must be rewritten.** Do not extend it.

---

### File Locations — Architecture-Mandated (Do Not Deviate)

```
frontend/app/
├── dashboard/
│   ├── page.tsx                  ← REFACTOR (remove polling, render TriageQueue)
│   └── components/               ← CREATE THIS FOLDER
│       ├── TriageQueue.tsx       ← CREATE
│       └── TriageQueueItem.tsx   ← CREATE
└── lib/
    ├── types.ts                  ← DO NOT MODIFY (QueueEntry already here)
    ├── api.ts                    ← DO NOT TOUCH
    └── useTriageStream.ts        ← CREATE
```

`TriageQueueItem.tsx` and `TriageQueue.tsx` live in `dashboard/components/`, **not** in `app/components/` (those are shared patient-facing components).

---

### `useTriageStream.ts` — Exact Behaviour

```typescript
"use client"  // NOT needed on hooks, but components using it need "use client"

import { useEffect, useState } from "react"
import { QueueEntry } from "@/app/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export function useTriageStream(): QueueEntry[] {
  const [entries, setEntries] = useState<QueueEntry[]>([])

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/v1/triage/queue`)

    es.addEventListener("triage_update", (event: MessageEvent) => {
      const entry = JSON.parse(event.data) as QueueEntry
      setEntries(prev => [entry, ...prev])
    })

    return () => {
      es.close()
    }
  }, [])

  return entries
}
```

**Key rules:**
- `EventSource` constructor takes the full URL including protocol/host
- Listen for named event `"triage_update"` via `addEventListener`, not `onmessage` (onmessage only fires for unnamed events)
- Prepend: `[entry, ...prev]` — newest entry at index 0
- No `onerror` handler with reconnect logic — browser `EventSource` reconnects automatically on drop
- Backlog entries (existing queue on connect) arrive as a stream of individual `triage_update` events — they populate `entries` correctly via the same prepend logic

---

### MTS Greek Labels — Define in `TriageQueueItem.tsx`

The SSE `QueueEntry` payload has `mts_level` (integer 1–5) but **no `mts_label`** field. Map it locally:

```typescript
const MTS_LABELS: Record<number, string> = {
  1: "Άμεση Αντιμετώπιση",
  2: "Πολύ Επείγον",
  3: "Επείγον",
  4: "Λιγότερο Επείγον",
  5: "Μη Επείγον",
}
```

**Source:** `backend/data/corpus/mts_guidelines.md` (Greek names) + `backend/app/services/llm_service.py` (English equivalents for reference)

---

### MTS Colour Consistency — Must Match `TriageResult.tsx`

From `frontend/app/components/TriageResult.tsx`:
```typescript
const MTS_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-red-600 text-white",
  3: "bg-orange-500 text-white",
  4: "bg-green-600 text-white",
  5: "bg-green-600 text-white",
}
```

Copy this exact map into `TriageQueueItem.tsx`. **Do not use different classes** — AC #5 explicitly requires visual consistency with the patient results screen.

Row background for urgency (existing pattern from dashboard, keep it):
- `mts_level <= 2` → row `bg-red-50`
- others → `bg-white`

---

### WCAG 2.1 AA Requirements (NFR10)

- `bg-red-600 text-white` (levels 1–2): ratio ≈ 5.9:1 ✅ passes AA
- `bg-orange-500 text-white` (level 3): ratio ≈ 3.1:1 — marginally fails AA for small text; use `font-semibold` to ensure large-text threshold
- `bg-green-600 text-white` (levels 4–5): ratio ≈ 5.1:1 ✅ passes AA
- Add `aria-label` on MTS badge: `aria-label={`Επίπεδο κινδύνου ${MTS_LABELS[entry.mts_level]}`}`
- Table headers must have `scope="col"` (existing pattern — preserve it)
- Page heading must be `<h1>` (not `<h2>` as in current file) for correct page structure

---

### `"use client"` Placement

- `useTriageStream.ts` — custom hook. Does NOT need `"use client"` at file top (it's not a component). BUT any component that uses it must be a Client Component.
- `TriageQueue.tsx` — MUST have `"use client"` at top (uses the hook with `useState`/`useEffect` internally)
- `TriageQueueItem.tsx` — pure presentational, receives only serialisable props → **no** `"use client"` needed unless you add event handlers later
- `page.tsx` — after refactor, renders `<TriageQueue />` (a client component) from a Server Component. This is valid in Next.js App Router — the server component can render client component children.

---

### Next.js Version Warning

`package.json` shows Next.js **16.2.4** and React **19.2.4**. AGENTS.md warns: "This version has breaking changes — read `node_modules/next/dist/docs/` before writing any code."

The existing code (`TriageForm.tsx`, `TriageResult.tsx`) already works — follow their exact patterns:
- `"use client"` at top of files that use hooks
- `@/app/...` import paths
- Plain `useState` / `useEffect` — no React 19 experimental APIs (`use()`, etc.)
- `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` for API base

---

### SSE Event Format Reference (from Story 4.1)

The backend emits:
```
event: triage_update
data: {"patient_id":"test-001","mts_level":2,"specialty":"Καρδιολογία","timestamp":"2026-04-17T10:30:00+00:00"}

```

Parse with `JSON.parse(event.data)` — the result matches `QueueEntry` from `frontend/app/lib/types.ts` exactly. No transformation needed.

---

### `QueueEntry` Type — Already Exists, Do Not Modify

`frontend/app/lib/types.ts` already defines:
```typescript
export interface QueueEntry {
  patient_id: string
  mts_level: number
  specialty: string
  timestamp: string
}
```

Import from `@/app/lib/types` in all new files. **Do not re-declare this interface anywhere.**

---

### Anti-Patterns — Explicitly Forbidden

- ✗ Using `fetch` with streaming/chunked responses to consume SSE — use `EventSource` only
- ✗ Using `onmessage` to listen for events — use `addEventListener("triage_update", ...)` (named events)
- ✗ Custom reconnect logic (`onerror` with `setTimeout`, retry counters) — browser handles natively
- ✗ Putting `TriageQueue.tsx` or `TriageQueueItem.tsx` in `app/components/` (that folder is for patient-facing shared components)
- ✗ Putting `useTriageStream.ts` in `app/dashboard/` — it belongs in `app/lib/`
- ✗ Importing `_queue` deque or anything from the backend — only consume via SSE
- ✗ Keeping the `setInterval` polling from the existing `page.tsx`
- ✗ Any English-language labels visible to the nurse (column headers, empty state, status text)
- ✗ Using `console.log` or `console.error` — these are banned in production code

---

### `TriageQueue.tsx` Table Structure (Reference)

Preserve the existing table structure from the polling implementation, but columns must be all-Greek:

| Column | Greek Label | Data |
|--------|-------------|------|
| Ώρα | Ώρα (Τοπική) | `new Date(entry.timestamp).toLocaleTimeString("el-GR")` |
| ID | ID Ασθενούς | `entry.patient_id.slice(0, 8) + "..."` |
| Επίπεδο | Επίπεδο MTS | Badge with Greek label |
| Ειδικότητα | Ειδικότητα | `entry.specialty` |

Note: Existing table has "Patient ID" in English — change to "ID Ασθενούς" to satisfy NFR9 (AC #7).

---

### Testing — Frontend Testing Stack

Check what test framework exists before writing tests:
```bash
cat frontend/package.json | grep -E '"jest"|"vitest"|"@testing-library"'
```

If no test framework is configured, testing is limited to manual E2E verification. Do NOT add a test framework as part of this story — that would be out of scope.

**Manual E2E verification** (AC #10):
```bash
# Terminal 1: start full stack
docker compose up

# Browser Tab 1: open dashboard
http://localhost:3000/dashboard

# Browser Tab 2: submit triage
open http://localhost:3000
# Fill in symptoms in Greek, submit

# Expected: new entry appears in dashboard within 2 seconds
```

---

### Project Structure Notes

- `frontend/app/dashboard/` already exists with `page.tsx` — add `components/` subfolder
- `frontend/app/lib/` already exists with `api.ts`, `types.ts` — add `useTriageStream.ts` alongside
- No new npm packages required — `EventSource` is a browser native API, no polyfill needed for modern browsers
- No changes to backend needed — Story 4.1 is complete and SSE endpoint is live

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` § Story 4.2 (AC); § FR10–12, NFR2, NFR9, NFR10
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Frontend structure (file locations); § SSE Event Format; § Communication Patterns; § Anti-patterns
- Story 4.1 (done): `_bmad-output/implementation-artifacts/4-1-sse-triage-queue-stream-endpoint.md` (SSE endpoint impl, event format, queue.py patterns)
- MTS Greek labels: `backend/data/corpus/mts_guidelines.md`
- MTS English labels: `backend/app/services/llm_service.py:13`
- Existing MTS colors: `frontend/app/components/TriageResult.tsx:9`
- QueueEntry type: `frontend/app/lib/types.ts:23`
- Existing dashboard (to be replaced): `frontend/app/dashboard/page.tsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered.

### Completion Notes List

- Created `useTriageStream.ts` hook using native `EventSource` API. Listens for named `triage_update` events and prepends each new `QueueEntry` immutably. No reconnect logic — browser handles natively.
- Created `TriageQueueItem.tsx` presentational component. Uses `MTS_LABELS` for Greek text, `MTS_COLORS` identical to `TriageResult.tsx` for badge consistency, `aria-label` on badge for WCAG compliance, row highlight `bg-red-50` for levels 1–2.
- Created `TriageQueue.tsx` client component (`"use client"`). Calls `useTriageStream()`, renders table with all-Greek headers (`ID Ασθενούς` replacing English "Patient ID"), maps to `TriageQueueItem` rows.
- Replaced `dashboard/page.tsx` — removed `"use client"`, polling `setInterval`, `fetchQueue`, duplicate `API_BASE` TypeScript error. Now a Server Component rendering `<TriageQueue />`. Heading promoted to `<h1>` per WCAG.
- No test framework exists in `frontend/package.json` — unit test task documented as skipped per story Dev Notes guidance.
- TypeScript check (`tsc --noEmit`) passed with no errors.

### File List

- `frontend/app/lib/useTriageStream.ts` (created)
- `frontend/app/dashboard/components/TriageQueueItem.tsx` (created)
- `frontend/app/dashboard/components/TriageQueue.tsx` (created)
- `frontend/app/dashboard/page.tsx` (refactored)

## Change Log

- 2026-04-18: Story 4.2 implemented — replaced polling dashboard with SSE-driven real-time queue UI
