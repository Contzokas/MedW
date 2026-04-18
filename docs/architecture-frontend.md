# Architecture — Frontend (Next.js)

> Generated: 2026-04-18 | Part: `frontend` | Language: TypeScript | Framework: Next.js 16.2.4

---

## Executive Summary

The MedW frontend is a Next.js 16 / React 19 application serving two distinct user-facing surfaces: a patient triage form (`/`) and a nurse real-time dashboard (`/dashboard`). The patient flow is a single-page interaction — symptom input → API call → results display. The nurse dashboard consumes a live SSE stream from the backend, updating a triage queue table in real time without polling. Styling uses Tailwind CSS v4. The codebase is Greek-language UI throughout.

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.x |
| Framework | Next.js | 16.2.4 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| CSS processing | PostCSS | — |
| Fonts | Geist Sans + Geist Mono (next/font/google) | — |
| Linting | ESLint + eslint-config-next | 16.2.4 |
| Containerization | Docker (node:20-alpine) | — |

---

## Architecture Pattern

**Next.js App Router** with a clear separation of:
- **Server components** — route pages (layout, top-level pages)
- **Client components** — interactive UI (`"use client"` directive)
- **Shared lib** — API client, types, custom hooks

```
app/
├── layout.tsx          (Server component — root shell, fonts, metadata)
├── page.tsx            (Client component — patient triage page)
├── components/         (Client components — shared UI)
├── dashboard/
│   ├── page.tsx        (Server component — nurse dashboard entry)
│   └── components/     (Client components — queue table)
└── lib/
    ├── api.ts          (API client — fetch wrapper)
    ├── types.ts        (TypeScript interfaces — shared contracts)
    └── useTriageStream.ts  (Custom hook — SSE consumer)
```

---

## Routes

| Route | Component | Description |
|---|---|---|
| `/` | `app/page.tsx` | Patient-facing triage form. Conditionally renders `TriageForm` or `TriageResult`. |
| `/dashboard` | `app/dashboard/page.tsx` | Nurse-facing live triage queue dashboard. |

---

## Component Architecture

### Patient Triage Flow (`/`)

```
page.tsx  (state: result | null)
  ├── result === null  →  <TriageForm onResult={setResult} />
  └── result !== null →  <TriageResult result={result} />
                              ├── <Disclaimer />
                              └── <DoctorCard doctor={...} redirectUrl={...} />
```

State management is local React `useState` — no global store needed.

### Nurse Dashboard (`/dashboard`)

```
dashboard/page.tsx
  └── <TriageQueue />          (consumes useTriageStream hook)
        └── entries.map()
              └── <TriageQueueItem entry={entry} />
```

The `useTriageStream()` hook manages the `EventSource` lifecycle and deduplicates incoming entries by `(patient_id, timestamp, mts_level, specialty)` composite key.

---

## Data Flow

### Patient Triage Submission

```
TriageForm
  │  onSubmit: crypto.randomUUID() → patient_id
  │  submitTriage(symptoms, patientId)
  │    └── fetch POST /api/v1/triage  { symptoms, patient_id }
  │
  └── TriageResult receives TriageResponse
        ├── MTS level badge (color-coded 1–5)
        ├── Recommended specialty
        ├── DoctorCard (name, specialty, fallback note, finddoctors.gov.gr link)
        └── Reasoning text (Greek, from LLM)
```

### Real-Time Nurse Dashboard

```
useTriageStream()
  └── EventSource GET /api/v1/triage/queue
        │  event: triage_update
        │  data: { patient_id, mts_level, specialty, timestamp }
        │
        └── setEntries(prev => [newEntry, ...prev])   (prepend, deduplicate)

TriageQueue renders entries as table rows
TriageQueueItem displays:
  - Local time (toLocaleTimeString("el-GR"))
  - Patient ID (first 8 chars of UUID)
  - MTS level badge (color-coded)
  - Specialty (Greek name)
  - Row background: red-50 for MTS ≤2, white otherwise
```

---

## State Management

The frontend uses **local React state only** — no Redux, Zustand, or Context API.

| State | Location | Type |
|---|---|---|
| Triage result | `app/page.tsx` | `TriageResponse \| null` |
| Form input | `TriageForm.tsx` | `string` |
| Loading state | `TriageForm.tsx` | `boolean` |
| Error message | `TriageForm.tsx` | `string \| null` |
| Queue entries | `useTriageStream.ts` | `QueueEntry[]` |

---

## API Client (`lib/api.ts`)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000"

export async function submitTriage(symptoms: string, patientId: string): Promise<TriageResponse>
```

`NEXT_PUBLIC_API_URL` is baked into the Next.js bundle at build time (injected as a Docker build arg in `Dockerfile`).

---

## SSE Hook (`lib/useTriageStream.ts`)

```typescript
export function useTriageStream(): QueueEntry[]
```

- Creates `EventSource` on mount, closes on unmount
- Validates incoming JSON with a type guard (`isQueueEntry`)
- Deduplicates entries by composite key to prevent duplicates on reconnect
- Returns entries in reverse-chronological order (newest first)

---

## MTS Color Coding

Used consistently across `TriageResult.tsx` and `TriageQueueItem.tsx`:

| MTS Level | Badge Color | Meaning |
|---|---|---|
| 1 | `bg-red-600` | Immediate |
| 2 | `bg-red-600` | Very Urgent |
| 3 | `bg-orange-500` | Urgent |
| 4 | `bg-green-600` | Less Urgent |
| 5 | `bg-green-600` | Non-urgent |

---

## Internationalisation

- All UI text is in **Greek** (hardcoded, no i18n library)
- `<html lang="el">` set in root layout
- Emergency number `166` (ΕΚΑΒ) shown prominently on triage page
- Date/time formatting uses `toLocaleTimeString("el-GR")` in dashboard

---

## Build and Deployment

```dockerfile
FROM node:20-alpine
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm ci && npm run build
CMD ["npm", "start"]    # next start on :3000
```

The `NEXT_PUBLIC_API_URL` build arg is passed from `docker-compose.yml`:
```yaml
args:
  - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
```
