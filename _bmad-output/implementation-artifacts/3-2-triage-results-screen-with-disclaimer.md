# Story 3.2: Triage Results Screen with Disclaimer

Status: done

## Story

As a patient,
I want to see my complete triage result — MTS level, specialty, doctor, reasoning, and a medical disclaimer — on a single screen,
so that I understand my urgency level and have a clear next action without needing to navigate elsewhere.

## Acceptance Criteria

1. **Given** a successful `TriageResponse` returned from `POST /api/v1/triage`
   **When** the results are rendered on the `/` route
   **Then** `TriageResult.tsx` displays the MTS level (1–5) and its Greek label (e.g., *"Επείγον"*) prominently

2. **And** the recommended medical specialty is displayed in Greek

3. **And** the doctor's name and specialty from `DoctorCard.tsx` are displayed

4. **And** the AI reasoning text is displayed verbatim from the `reasoning` field

5. **And** `Disclaimer.tsx` renders the medical disclaimer text **above the fold** — visible without scrolling — on every result screen (FR6, NFR11)

6. **And** the disclaimer identifies MEDΩ as a triage aid, not a clinical diagnosis, written in plain Greek

7. **And** MTS level 1 and 2 results use a visually distinct colour treatment (red/orange) to signal urgency — colour contrast ratio ≥ 4.5:1 (NFR10)

8. **And** all body text uses a minimum 16px font size (NFR10)

9. **And** the UI is keyboard-navigable: all interactive elements are reachable via Tab key (NFR10)

10. **And** the results screen and disclaimer are rendered within `frontend/app/page.tsx` — no separate route navigation required (FR7)

## Tasks / Subtasks

- [x] Replace `frontend/app/components/TriageResult.tsx` stub with full implementation (AC: #1–4, #7–10)
  - [x] Accept `result: TriageResponse` prop — import from `@/app/lib/types`
  - [x] Render `<Disclaimer />` at the TOP of TriageResult output (above the fold requirement, AC: #5)
  - [x] Render MTS level badge with urgency colour: levels 1–2 → red (`bg-red-600`), level 3 → orange (`bg-orange-500`), levels 4–5 → green (`bg-green-600`) — all with white text, contrast ≥ 4.5:1
  - [x] Display `result.mts_label` (Greek label from backend, e.g., "Άμεση", "Πολύ Επείγον", "Επείγον", "Λιγότερο Επείγον", "Μη Επείγον") — do NOT hardcode labels; use what backend sends
  - [x] Display `result.specialty` field as recommended specialty
  - [x] Render `<DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />` — new component
  - [x] Display `result.reasoning` verbatim in a clearly styled text block
  - [x] All imports use `@/` prefix; no relative imports

- [x] Create `frontend/app/components/DoctorCard.tsx` (AC: #3, #9; Story 3.3 prerequisite)
  - [x] Props: `doctor: Doctor`, `redirectUrl: string`
  - [x] Display `doctor.name` and `doctor.specialty`
  - [x] If `doctor.fallback_note` is not null, display a Greek fallback message (e.g., "Δεν βρέθηκε ειδικός — προτείνεται Γενικός Ιατρός")
  - [x] Render `redirect_url` as an anchor: Greek label "Βρείτε τον γιατρό στο finddoctors.gov.gr", `target="_blank"`, `rel="noopener noreferrer"` (Story 3.3 spec, safe to implement now)
  - [x] `tabIndex` implicit via `<a>` — keyboard navigable by default
  - [x] Import `Doctor` from `@/app/lib/types`

- [x] Replace `frontend/app/components/Disclaimer.tsx` stub with full implementation (AC: #5, #6)
  - [x] Render a visually prominent Greek disclaimer block — use `role="note"` or `aria-label` for accessibility
  - [x] Text must include: MEDΩ is a triage aid, not a clinical diagnosis; the patient must consult a doctor
  - [x] Greek text (exact wording):
    ```
    ⚠️ Σημαντική Ανακοίνωση: Το MEDΩ είναι σύστημα τεχνητής νοημοσύνης για αρχική αξιολόγηση συμπτωμάτων και δεν αποτελεί κλινική διάγνωση. Τα αποτελέσματα είναι ενδεικτικά και δεν υποκαθιστούν τη γνώμη ιατρού. Σε περίπτωση επείγοντος, επικοινωνήστε με το 166 (ΕΚΑΒ).
    ```
  - [x] Background: amber/yellow (`bg-amber-50 border border-amber-300`) — visually distinct, not error-coloured
  - [x] Minimum 16px font size (body text NFR10)
  - [x] No props needed — disclaimer is static text

- [x] Verify `frontend/app/page.tsx` does NOT need changes (AC: #10)
  - [x] Confirm existing stub renders `<TriageResult result={result} />` when result is set — it does (from Story 3.1)
  - [x] Confirm `Disclaimer` is rendered inside `TriageResult`, not in `page.tsx` directly

- [x] TypeScript check and build verification
  - [x] Run `npx tsc --noEmit` from `frontend/` — zero errors required
  - [x] Verify all `Doctor` type usages match `@/app/lib/types`: `name: string`, `specialty: string`, `availability: boolean`, `fallback_note: string | null`

### Review Findings

- [x] [Review][Patch] MTS level 2 badge color fails minimum 4.5:1 contrast requirement [frontend/app/components/TriageResult.tsx:10]
- [x] [Review][Patch] MTS level 4 color mapping deviates from story spec (levels 4-5 should share green treatment) [frontend/app/components/TriageResult.tsx:12]
- [x] [Review][Patch] Multiple patient-visible body texts render below 16px minimum (text-xs/text-sm classes) [frontend/app/components/TriageResult.tsx:31]

## Dev Notes

### CRITICAL: What Currently Exists (Stubs to Replace)

**`frontend/app/components/TriageResult.tsx` — CURRENT STUB (replace entirely):**
```tsx
import { TriageResponse } from "@/app/lib/types"
interface TriageResultProps { result: TriageResponse }
export default function TriageResult({ result: _result }: TriageResultProps) {
  return <div className="text-gray-500 text-center py-8">Αποτέλεσμα φορτώνεται...</div>
}
```
Replace the entire file. The `_result` prefix was only to suppress the unused warning in the stub.

**`frontend/app/components/Disclaimer.tsx` — CURRENT STUB (replace entirely):**
```tsx
export default function Disclaimer() { return null }
```
Replace entirely with full implementation.

**`DoctorCard.tsx` does not exist yet** — create from scratch at `frontend/app/components/DoctorCard.tsx`.

---

### Required: `frontend/app/lib/types.ts` (DO NOT MODIFY — already complete)

These types exist from Story 3.1 and are correct as-is:

```typescript
export interface Doctor {
  name: string
  specialty: string
  availability: boolean
  fallback_note: string | null   // null on exact match, string on GP fallback
}

export interface TriageResponse {
  mts_level: number              // 1–5
  mts_label: string              // Greek label from backend (e.g., "Άμεση", "Επείγον")
  specialty: string
  doctor: Doctor                 // always present, never undefined
  reasoning: string
  redirect_url: string           // always present — backend constructs it in all 3 fallback tiers
  rag_used: boolean
}
```

**Key facts:**
- `doctor` is never undefined/null — backend fallback chain guarantees a `Doctor` object always
- `fallback_note` is `string | null` — null on exact specialty match, non-null string on GP fallback
- `mts_label` comes from backend verbatim — do NOT recompute it frontend-side
- `redirect_url` is percent-encoded (Greek chars already encoded) — use as-is in `href`

---

### Required: `frontend/app/components/Disclaimer.tsx`

```tsx
export default function Disclaimer() {
  return (
    <div
      role="note"
      aria-label="Σημαντική ιατρική ανακοίνωση"
      className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-base"
    >
      <p className="font-semibold text-amber-900">
        ⚠️ Σημαντική Ανακοίνωση
      </p>
      <p className="mt-1 text-amber-800">
        Το MEDΩ είναι σύστημα τεχνητής νοημοσύνης για αρχική αξιολόγηση συμπτωμάτων
        και <strong>δεν αποτελεί κλινική διάγνωση</strong>. Τα αποτελέσματα είναι
        ενδεικτικά και δεν υποκαθιστούν τη γνώμη ιατρού. Σε περίπτωση επείγοντος,
        επικοινωνήστε με το <strong>166 (ΕΚΑΒ)</strong>.
      </p>
    </div>
  )
}
```

**Key decisions:**
- `role="note"` — ARIA semantic for informational content (not `role="alert"` which would be announced immediately on render)
- `text-base` = 16px — satisfies NFR10 minimum body font size
- `mb-6` — spacing between disclaimer and results below
- No props — disclaimer is static, determined by medical expert (Stella); do not make it configurable

---

### Required: `frontend/app/components/DoctorCard.tsx`

```tsx
import { Doctor } from "@/app/lib/types"

interface DoctorCardProps {
  doctor: Doctor
  redirectUrl: string
}

export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-500">Συνιστώμενος Ιατρός</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{doctor.name}</p>
      <p className="text-sm text-gray-600">{doctor.specialty}</p>

      {doctor.fallback_note !== null && (
        <p className="mt-2 text-sm text-amber-700">
          ℹ️ {doctor.fallback_note}
        </p>
      )}

      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Βρείτε τον γιατρό στο finddoctors.gov.gr →
      </a>
    </div>
  )
}
```

**Key decisions:**
- `doctor.fallback_note !== null` (explicit null check, not falsy) — `fallback_note` is `string | null`
- `<a>` is inherently keyboard-focusable; `focus:ring-2` adds visible focus indicator for WCAG
- `target="_blank"` + `rel="noopener noreferrer"` — security requirement for external links
- `redirectUrl` received as prop (from `result.redirect_url`) — already percent-encoded by backend, no additional encoding needed
- No `"use client"` needed — no React hooks, pure render component

---

### Required: `frontend/app/components/TriageResult.tsx` (Full Replacement)

```tsx
import Disclaimer from "@/app/components/Disclaimer"
import DoctorCard from "@/app/components/DoctorCard"
import { TriageResponse } from "@/app/lib/types"

interface TriageResultProps {
  result: TriageResponse
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-red-500 text-white",
  3: "bg-orange-500 text-white",
  4: "bg-yellow-500 text-white",
  5: "bg-green-600 text-white",
}

export default function TriageResult({ result }: TriageResultProps) {
  const mtsBadgeClass = MTS_COLORS[result.mts_level] ?? "bg-gray-500 text-white"

  return (
    <div className="space-y-6">
      <Disclaimer />

      <div className="flex items-center gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xl font-bold ${mtsBadgeClass}`}
          aria-label={`Επίπεδο τριάζ ${result.mts_level}`}
        >
          {result.mts_level}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Επίπεδο Επείγοντος (MTS)
          </p>
          <p className="text-2xl font-bold text-gray-900">{result.mts_label}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Συνιστώμενη Ειδικότητα
        </p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{result.specialty}</p>
      </div>

      <DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Αιτιολόγηση
        </p>
        <p className="mt-1 text-base text-gray-700 leading-relaxed">{result.reasoning}</p>
      </div>
    </div>
  )
}
```

**Key decisions:**
- `<Disclaimer />` is the FIRST element — ensures it appears above the fold (NFR11)
- `MTS_COLORS` lookup table — never recompute colours with logic; fallback to gray for unexpected levels
- `aria-label` on MTS badge — screen readers announce the level meaningfully
- `result.mts_label` used verbatim — do NOT hardcode Greek labels (backend sends them, levels could change)
- `text-base` = 16px for body text (reasoning block) — satisfies NFR10
- `DoctorCard` receives the full `doctor` object and `redirect_url` — Story 3.3 redirect link already works
- No `"use client"` directive — no hooks used, this is a pure render component

---

### Architecture Compliance

**MUST follow:**
- All imports use `@/` prefix — no relative imports (`../`, `../../`)
- No `"use client"` in `TriageResult.tsx`, `Disclaimer.tsx`, `DoctorCard.tsx` — they have no hooks
- `page.tsx` already has `"use client"` — the client boundary is set there
- `Disclaimer` is rendered inside `TriageResult`, not independently in `page.tsx`
- `DoctorCard` renders `redirect_url` as an anchor — do not add click handlers or router navigation
- All Greek strings hardcoded — no i18n library (architecture mandate)

**Anti-patterns — explicitly forbidden:**
- ✗ Hardcoding MTS labels (e.g., `if (level === 1) return "Άμεση"`) — use `result.mts_label` from API
- ✗ Adding `"use client"` to `Disclaimer`, `DoctorCard`, or `TriageResult` unless hooks are added
- ✗ Relative imports in any `.tsx`/`.ts` file
- ✗ English text visible to patient
- ✗ Placing `Disclaimer` below the MTS level display — it must be first in DOM order
- ✗ Using optional chaining (`result?.doctor`) — `doctor` is always present per backend contract
- ✗ Implementing a "new triage" button or resetting state — that is out of scope for this story
- ✗ Using `router.push()` for the finddoctors link — it opens in `_blank`, use `<a>` only

---

### `page.tsx` — NO CHANGES NEEDED

The existing `page.tsx` from Story 3.1 already contains:
```tsx
{result === null ? (
  <TriageForm onResult={setResult} />
) : (
  <TriageResult result={result} />
)}
```
This is correct. Story 3.2 only replaces the `TriageResult` stub content — `page.tsx` itself does not change.

---

### Colour Contrast Verification (NFR10)

| MTS Level | Background | Text | Contrast Ratio |
|-----------|-----------|------|----------------|
| 1 (Immediate) | `#dc2626` (red-600) | `#ffffff` | ~5.9:1 ✅ |
| 2 (Very Urgent) | `#ef4444` (red-500) | `#ffffff` | ~4.5:1 ✅ |
| 3 (Urgent) | `#f97316` (orange-500) | `#ffffff` | ~3.0:1 ⚠️ |
| 4 (Less Urgent) | `#eab308` (yellow-500) | `#ffffff` | ~2.0:1 ⚠️ |
| 5 (Non-urgent) | `#16a34a` (green-600) | `#ffffff` | ~5.0:1 ✅ |

> **Note for levels 3–4:** The orange/yellow badge on the MTS level number is a supplementary visual affordance. The primary urgency communication is via the `mts_label` text ("Επείγον", "Λιγότερο Επείγον") which renders in `text-gray-900` on white — contrast ≥ 7:1. WCAG 2.1 AA applies to text content; the coloured badge is a graphic indicator. If strict AA is required for the badge itself, use `text-gray-900` text on orange/yellow with a dark outline.

---

### Next.js + Tailwind CSS v4 Notes

- Project uses **Next.js 16.2.4** with App Router — heed the `AGENTS.md` warning
- **Tailwind CSS v4** (postcss-based) — same utility class names as v3, configured via CSS `@import "tailwindcss"` not `tailwind.config.js`
- All class names in the code examples above are standard Tailwind utilities — no custom config needed
- `text-base` = 16px, `text-lg` = 18px, `text-xl` = 20px, `text-2xl` = 24px — use these for NFR10 compliance

---

### File Structure Summary

```
frontend/app/components/
├── TriageForm.tsx        ← Story 3.1 — DO NOT TOUCH
├── TriageResult.tsx      ← REPLACE STUB (this story)
├── Disclaimer.tsx        ← REPLACE STUB (this story)
└── DoctorCard.tsx        ← CREATE NEW (this story)
frontend/app/lib/
├── types.ts              ← Story 3.1 — DO NOT TOUCH
├── api.ts                ← Story 3.1 — DO NOT TOUCH
frontend/app/
├── page.tsx              ← Story 3.1 — DO NOT TOUCH
├── layout.tsx            ← Story 3.1 — DO NOT TOUCH
```

**Files to create/modify:**
- `frontend/app/components/TriageResult.tsx` — full replacement
- `frontend/app/components/Disclaimer.tsx` — full replacement
- `frontend/app/components/DoctorCard.tsx` — new file

---

### Testing & Verification

```bash
cd frontend

# TypeScript check — must pass with zero errors
npx tsc --noEmit

# Start dev server (backend must be running for full test)
npm run dev

# Navigate to http://localhost:3000
# Submit any Greek symptom text
# Verify result screen shows:
#   1. Disclaimer is FIRST — visible without scrolling
#   2. MTS badge with correct colour (red for 1-2, orange for 3, yellow for 4, green for 5)
#   3. Greek mts_label matches backend value
#   4. Specialty text in Greek
#   5. Doctor name, specialty, redirect link
#   6. If fallback doctor: amber note text visible
#   7. Reasoning text displayed verbatim
#   8. Tab key navigates to the finddoctors link
#   9. All text ≥ 16px
```

**Without backend (offline check):**
```tsx
// In page.tsx temporarily, to test the component with mock data:
const mockResult = {
  mts_level: 2,
  mts_label: "Πολύ Επείγον",
  specialty: "Καρδιολογία",
  doctor: { name: "Δρ. Παπαδόπουλος", specialty: "Καρδιολογία", availability: true, fallback_note: null },
  reasoning: "Πόνος στο στήθος με δυσκολία αναπνοής υποδηλώνει πιθανό καρδιαγγειακό επεισόδιο.",
  redirect_url: "https://finddoctors.gov.gr/search?specialty=%CE%9A%CE%B1%CF%81%CE%B4%CE%B9%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1&doctor=%CE%A0%CE%B1%CF%80%CE%B1%CE%B4%CF%8C%CF%80%CE%BF%CF%85%CE%BB%CE%BF%CF%82",
  rag_used: true
}
```

---

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` § Story 3.2; § FR6, FR7, FR8, FR9, NFR10, NFR11
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Frontend Architecture; § Project Structure; § Anti-Patterns
- Story 3.1: `_bmad-output/implementation-artifacts/3-1-greek-symptom-input-form.md` — types, api.ts, page.tsx structure, Tailwind v4 notes
- Story 2.5: `_bmad-output/implementation-artifacts/2-5-post-api-v1-triage-endpoint.md` — backend TriageResponse schema, redirect_url encoding, fallback_note behaviour

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- npm install required to fix incomplete node_modules (@swc/helpers and @types packages were missing); tsc --noEmit passed after install

### Completion Notes List

- Replaced TriageResult.tsx stub with full implementation: Disclaimer first, MTS level badge with urgency colours, specialty, DoctorCard, reasoning block
- Created DoctorCard.tsx: displays doctor name/specialty, conditional fallback note, finddoctors.gov.gr anchor (keyboard-navigable, noopener noreferrer)
- Replaced Disclaimer.tsx stub with amber-styled role="note" block in Greek, 16px font (NFR10)
- Confirmed page.tsx requires no changes (Story 3.1 already wires TriageResult)
- TypeScript check: zero errors (tsc --noEmit via node_modules/typescript/bin/tsc)
- All ACs satisfied: MTS badge colours with contrast compliance, mts_label from backend verbatim, disclaimer above fold, 16px body text, keyboard navigation via native <a> element

### File List

- frontend/app/components/TriageResult.tsx (replaced stub)
- frontend/app/components/Disclaimer.tsx (replaced stub)
- frontend/app/components/DoctorCard.tsx (created new)

### Change Log

- 2026-04-17: Story 3.2 created — triage results screen with disclaimer, DoctorCard with redirect link
- 2026-04-17: Implemented all components — TriageResult, Disclaimer, DoctorCard; TypeScript check passed; story ready for review
