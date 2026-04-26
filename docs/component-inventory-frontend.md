# Component Inventory — Frontend

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Pages

| Component | File | Route | Purpose |
|---|---|---|---|
| `Home` | `app/page.tsx` | `/` | Patient triage: hero, form, result, team |
| `Dashboard` | `app/dashboard/page.tsx` | `/dashboard` | Nurse dashboard: real-time queue |

---

## UI Components

### Patient-Facing

| Component | File | Props | Description |
|---|---|---|---|
| `TriageForm` | `components/TriageForm.tsx` | `onResult: (TriageResponse) => void` | Symptom textarea + submit. Generates UUID patient_id. |
| `TriageResult` | `components/TriageResult.tsx` | `result: TriageResponse` | MTS level (color-coded), specialty, reasoning, DoctorCard. |
| `DoctorCard` | `components/DoctorCard.tsx` | `doctor: Doctor`, `redirectUrl: string` | Doctor info + finddoctors.gov.gr link. |
| `Disclaimer` | `components/Disclaimer.tsx` | — | Medical disclaimer banner. |
| `TeamSection` | `components/TeamSection.tsx` | — | Project info + team wall, social links, tech badges. |

### Global

| Component | File | Description |
|---|---|---|
| `EmergencyBar` | `components/EmergencyBar.tsx` | Fixed bottom bar, 166 emergency number. |
| `ThemeToggle` | `components/ThemeToggle.tsx` | Dark/light toggle (moon/sun). |
| `LangToggle` | `components/LangToggle.tsx` | EN/EL switcher. |

### Dashboard

| Component | File | Props | Description |
|---|---|---|---|
| `TriageQueue` | `dashboard/components/TriageQueue.tsx` | — | Real-time queue table via useTriageStream. |
| `TriageQueueItem` | `dashboard/components/TriageQueueItem.tsx` | `entry: QueueEntry` | Row with MTS badge, Greek locale time. |

---

## Contexts & Hooks

| Name | File | Purpose |
|---|---|---|
| `LangProvider` / `useLang` | `lib/lang-context.tsx` | EN/EL language state, translation accessor |
| `ThemeProvider` / `useTheme` | `lib/theme-context.tsx` | Dark/light theme, localStorage persistence |
| `useTriageStream` | `lib/useTriageStream.ts` | EventSource SSE hook with deduplication |

---

## API & Utilities

| Module | File | Purpose |
|---|---|---|
| `api` | `lib/api.ts` | `submitTriage()` — POST /api/v1/triage |
| `backendResolver` | `lib/backendResolver.ts` | Dynamic backend URL with 2min cache |
| `types` | `lib/types.ts` | TriageRequest, Doctor, TriageResponse, QueueEntry |
| `translations` | `lib/translations.ts` | Full EN/EL translations object |
| `casing` | `lib/casing.ts` | `toCaps()` — Greek-aware uppercase |

---

## API Routes (Server-Side)

| Route | Methods | Purpose |
|---|---|---|
| `/api/config` | GET | `{ backendUrl }` from env |
| `/api/proxy/[...path]` | ALL | Backend proxy with header forwarding |

---

## Component Tree

```
RootLayout
├── ThemeProvider → LangProvider
│   ├── Home (/)
│   │   ├── Hero + TriageForm → submitTriage()
│   │   ├── TriageResult → DoctorCard
│   │   ├── Disclaimer
│   │   └── TeamSection
│   ├── Dashboard (/dashboard)
│   │   └── TriageQueue → TriageQueueItem[]
│   ├── EmergencyBar (fixed bottom)
│   └── ThemeToggle + LangToggle (fixed top-right)
```
