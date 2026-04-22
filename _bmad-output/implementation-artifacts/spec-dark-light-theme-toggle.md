---
title: 'Dark/Light Theme Toggle'
type: 'feature'
created: '2026-04-20'
status: 'done'
baseline_commit: '9fdd3c5c908d6b379286032d274f67a84d46bf17'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The MEDW frontend currently has no theme switching capability, forcing users to experience the interface in a single mode regardless of their visual preference or environmental conditions.

**Approach:** Implement a React context-based theme system that respects system preference by default, allows manual theme toggling, persists user choice across sessions, and applies consistent theming to both patient and nurse interfaces.

## Boundaries & Constraints

**Always:** 
- Theme choice must persist in localStorage between sessions
- System preference must be the default when no localStorage value exists
- Both light and dark themes must meet WCAG 2.1 AA contrast requirements (≥ 4.5:1)
- Toggle must be accessible via keyboard navigation
- Theme must apply to both `/` (patient) and `/dashboard` (nurse) routes
- All existing functionality must remain intact after theme implementation

**Ask First:**
- Any changes to color schemes beyond basic light/dark variations
- Adding theme transition animations or effects
- Changing the placement or design of the theme toggle button

**Never:**
- Do not break existing Greek language labels or medical disclaimer requirements
- Do not modify API integration or backend communication
- Do not change the core triage functionality or dashboard real-time updates
- Do not remove or modify the existing CSS variable system in globals.css
- Do not introduce new dependencies beyond what's already in package.json

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | User clicks toggle button | Theme switches between light and dark, UI reflects change immediately | N/A |
| SYSTEM_DEFAULT | First visit, no localStorage | Theme matches user's system preference (light/dark mode) | Fallback to light theme if system preference unavailable |
| SESSION_PERSISTENCE | User returns after closing browser | Theme remains as previously selected | Fallback to system preference if localStorage corrupted |
| KEYBOARD_NAVIGATION | User tabs to toggle and presses Enter/Space | Theme toggles, focus remains on button | N/A |
| STORAGE_ERROR | localStorage unavailable | System functions with system preference, logs warning | Console warning, no user-facing error |

</frozen-after-approval>

## Code Map

- `frontend/app/globals.css` -- Contains existing CSS variables for theming foundation
- `frontend/app/layout.tsx` -- Root layout where theme provider should be mounted
- `frontend/app/page.tsx` -- Patient form page needing theme-aware layout
- `frontend/app/dashboard/page.tsx` -- Nurse dashboard page needing theme-aware layout
- `frontend/app/components/TriageForm.tsx` -- Form component with hardcoded colors requiring theming
- `frontend/app/components/TriageResult.tsx` -- Results display needing theme-aware styling
- `frontend/app/components/Disclaimer.tsx` -- Medical disclaimer requiring proper contrast in both themes
- `frontend/app/components/DoctorCard.tsx` -- Doctor information card needing theme adaptation
- `frontend/app/dashboard/components/TriageQueue.tsx` -- Queue table requiring theme-aware styling
- `frontend/app/dashboard/components/TriageQueueItem.tsx` -- Individual queue items needing theming
- `frontend/app/lib/api.ts` -- Existing API client (no changes needed, reference only)
- `frontend/app/lib/useTriageStream.ts` -- Existing SSE hook (no changes needed, reference only)

## Tasks & Acceptance

**Execution:**
- [x] `frontend/app/lib/theme-context.tsx` -- Create React context with theme state, provider component, and custom hook for theme consumption -- Establishes centralized theme management
- [x] `frontend/app/components/ThemeToggle.tsx` -- Create accessible toggle button component with sun/moon icons and proper ARIA attributes -- Provides user interface for theme switching
- [x] `frontend/app/layout.tsx` -- Wrap children with ThemeProvider and add ThemeToggle to header -- Ensures theme system is available across entire application
- [x] `frontend/app/globals.css` -- Extend CSS variables for comprehensive light/dark color palettes -- Provides semantic color tokens for consistent theming
- [x] `frontend/app/components/TriageForm.tsx` -- Replace hardcoded colors with theme-aware Tailwind classes using CSS variables -- Ensures form adapts to current theme
- [x] `frontend/app/components/TriageResult.tsx` -- Convert to theme-aware styling for MTS levels and result display -- Maintains visual hierarchy in both themes
- [x] `frontend/app/components/Disclaimer.tsx` -- Apply theme-aware colors while maintaining prominence and contrast -- Ensures medical disclaimer remains visible in both themes
- [x] `frontend/app/components/DoctorCard.tsx` -- Update styling to use theme variables for backgrounds and text -- Provides consistent card appearance across themes
- [x] `frontend/app/dashboard/components/TriageQueue.tsx` -- Convert table styling to theme-aware classes -- Ensures dashboard is readable in both light and dark modes
- [x] `frontend/app/dashboard/components/TriageQueueItem.tsx` -- Apply theme-aware styling for queue item rows and MTS level indicators -- Maintains urgency signaling across themes
- [x] `frontend/app/page.tsx` -- Update layout structure to accommodate theme toggle header -- Ensures patient interface has consistent theme controls
- [x] `frontend/app/dashboard/page.tsx` -- Update layout structure to accommodate theme toggle header -- Ensures nurse interface has consistent theme controls

**Acceptance Criteria:**
- Given a user visiting MEDW for the first time, when they access either `/` or `/dashboard`, then the theme matches their system preference (light or dark mode)
- Given a user with a saved theme preference, when they return to the application, then their previously selected theme is active
- Given a user on any page, when they click the theme toggle button, then the interface immediately switches between light and dark themes
- Given a user navigating between patient form and nurse dashboard, when they switch routes, then the selected theme remains consistent across both interfaces
- Given the interface in dark mode, when viewing the medical disclaimer, then the text maintains ≥ 4.5:1 contrast ratio against the background
- Given the interface in either theme, when using keyboard navigation, then the theme toggle button is focusable and activatable via Enter/Space keys
- Given the nurse dashboard in dark mode, when viewing the triage queue, then MTS level indicators remain visually distinct and readable
- Given the triage results in either theme, when viewing urgency-based color coding, then the visual distinction between MTS levels 1-2 (urgent) and others remains clear

## Spec Change Log

## Design Notes

The implementation leverages React Context for theme state management and CSS variables for actual color application. This approach ensures:
- **Performance**: Theme changes trigger minimal re-renders through context optimization
- **Maintainability**: Centralized theme state makes future theme additions straightforward
- **Accessibility**: CSS variables work well with screen readers and can be overridden by user preferences
- **Developer Experience**: Tailwind's CSS variable integration allows using familiar utility classes

**Key Design Decisions:**
1. Using localStorage instead of cookies for simplicity and GDPR compliance (no server-side storage needed)
2. Maintaining existing CSS variable structure in globals.css while extending it
3. Placing theme toggle in a shared header component for consistent access across routes
4. Using semantic color names (e.g., `--primary`, `--background`) rather than theme-specific names

**Example CSS Variable Structure:**
```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #2563eb;
  --muted: #f3f4f6;
  --border: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --primary: #3b82f6;
    --muted: #1f2937;
    --border: #374151;
  }
}

[data-theme="light"] {
  --background: #ffffff;
  --foreground: #171717;
  /* ... light theme colors */
}

[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ededed;
  /* ... dark theme colors */
}
```

## Verification

**Commands:**
- `cd frontend && npm run build` -- expected: Build completes without errors
- `cd frontend && npm run lint` -- expected: No linting errors related to theme implementation
- `cd frontend && npm run dev` (manual testing) -- expected: Development server starts, theme toggle works across both routes

**Manual checks:**
- Open browser DevTools and verify localStorage contains `theme: 'light'` or `theme: 'dark'` after toggle
- Test keyboard navigation: Tab to theme toggle, press Enter/Space, verify theme changes
- Check contrast ratios using browser accessibility tools for both light and dark themes
- Verify theme persistence by closing and reopening browser
- Test on both `/` and `/dashboard` routes to ensure consistent behavior
- Verify system preference detection by changing OS theme settings and opening incognito window

### Review Findings

#### Decision Needed (4 items)
- [x] [Review][Decision] Theme value validation before storage — Resolved: Validation not required. Theme will only be light/dark.
- [x] [Review][Decision] localStorage quota exceeded handling — Resolved: Deferred. Validation/error handling not a concern for this implementation.
- [x] [Review][Decision] Theme value validation in localStorage — Resolved: Deferred. Validation not required for light/dark only themes.
- [x] [Review][Decision] System preference vs manual theme conflict resolution — Resolved: Use approach 1 - Respect manual selection permanently. Once user manually picks theme, ignore system changes.

#### Patches (23 items)
- [ ] [Review][Patch] Inconsistent focus ring offset patterns [frontend/app/components/TriageForm.tsx:48,65] — Some elements have focus:ring-offset-2 with dark mode overrides while others have ring-4 without offset. Creates inconsistent focus states and accessibility issues.
- [ ] [Review][Patch] Duplicate CSS variable definitions [frontend/app/globals.css:6-19,52-71] — Same color values defined twice in :root and [data-theme="light"] with identical values. Creates redundancy and potential conflicts.
- [ ] [Review][Patch] Header uses hardcoded colors instead of theme variables [frontend/app/layout.tsx:34-39] — Header uses gray-200/gray-800/white/gray-900 instead of border-border/bg-card/text-foreground. Bypasses theme system.
- [ ] [Review][Patch] MTS badge colors not theme-aware [frontend/app/components/TriageResult.tsx:9-15] — MTS_COLORS uses hardcoded bg-red-500, bg-orange-500 etc. without dark mode variants. Won't adapt properly to dark theme.
- [ ] [Review][Patch] Theme toggle accessibility implementation needs verification [frontend/app/components/ThemeToggle.tsx:8-14] — Cannot verify proper role="button", ARIA attributes, keyboard support (Enter/Space), or focus states from diff alone.
- [ ] [Review][Patch] localStorage error handling missing [frontend/app/lib/theme-context.tsx:20,34] — Direct localStorage access without try-catch blocks will crash in private browsing mode or iframe restrictions.
- [ ] [Review][Patch] Theme state race condition during initial load [frontend/app/lib/theme-context.tsx:18-28] — Components may render with default "light" theme even if user prefers dark during localStorage initialization window.
- [ ] [Review][Patch] CSS variable cascade conflicts [frontend/app/globals.css:38-89] — Variables defined three times with conflicting selectors: :root, @media (prefers-color-scheme: dark), and [data-theme="light/dark"]. May cause unexpected theme behavior.
- [ ] [Review][Patch] MediaQuery listener lifecycle issues [frontend/app/lib/theme-context.tsx:39-48] — Listener only attached when !localStorage.getItem("theme") at mount time, not dynamically. Won't re-attach if user deletes localStorage after manual toggle.
- [ ] [Review][Patch] Header semantic HTML structure issues [frontend/app/layout.tsx:35-36] — Multiple h1 elements on same page (brand logo in header + page h1). Violates HTML semantic standards and impacts accessibility/SEO.
- [ ] [Review][Patch] Theme provider implementation verification needed [frontend/app/lib/theme-context.tsx:all] — Cannot verify system preference detection using prefers-color-scheme, data-theme attribute application, or fallback behavior from diff alone.
- [ ] [Review][Patch] Missing data attribute application for theme [frontend/app/lib/theme-context.tsx:all] — ThemeProvider must set data-theme="light"/"dark" on HTML element for manual theme selection to work via CSS selectors.
- [ ] [Review][Patch] Focus ring offset hardcoded for dark mode [multiple files] — dark:focus:ring-offset-gray-900 used throughout instead of theme-aware offset. May appear mismatched or invisible in non-standard dark themes.
- [ ] [Review][Patch] Theme transition missing reduced motion support [frontend/app/globals.css:all] — No prefers-reduced-motion media query check to gate theme transitions. Users with vestibular disorders may experience nausea from color transitions.
- [ ] [Review][Patch] Missing CSS variable fallbacks [frontend/app/globals.css:all] — CSS variables used without fallback values (e.g., color: var(--foreground)). If variables fail to load, elements may be invisible or unstyled.
- [ ] [Review][Patch] Inconsistent text color hierarchy [multiple components] — Original implementation used deliberate hierarchy (gray-500, gray-700, gray-900). New implementation replaces multiple shades with single semantic colors, reducing visual distinction.
- [ ] [Review][Patch] MTS level indicators still use hardcoded colors [frontend/app/dashboard/components/TriageQueueItem.tsx:15-21] — MTS_COLORS object uses hardcoded backgrounds without theme variants. Won't adapt to dark mode properly.
- [ ] [Review][Patch] Redundant border classes [multiple components] — Combining bg-card with border-border may cause visual inconsistency if card background doesn't match border color in all theme states.
- [ ] [Review][Patch] Missing responsive header styling [frontend/app/layout.tsx:38] — Header has fixed h-16 (64px) height without mobile consideration. May be too tall/short for smaller viewports.
- [ ] [Review][Patch] Theme attribute not removed on system preference mode [frontend/app/lib/theme-context.tsx:31-36] — When following system preferences, data-theme attribute is set but never removed. CSS cascade may prioritize [data-theme] over :root media queries.
- [ ] [Review][Patch] Page backgrounds may break system preference detection [frontend/app/page.tsx:12, frontend/app/dashboard/page.tsx:5] — Pages explicitly set bg-muted background. CSS variable precedence order is unclear when system preference is active theme state.

#### Deferred (6 items)
- [x] [Review][Defer] UUID generation browser compatibility [frontend/app/components/TriageForm.tsx:25] — deferred, pre-existing — crypto.randomUUID() not supported in older browsers (Safari < 15.4, IE). Pre-existing issue outside theme scope.
- [x] [Review][Defer] Date formatting locale fallback [frontend/app/dashboard/components/TriageQueueItem.tsx:32] — deferred, pre-existing — toLocaleTimeString("el-GR") assumes Greek locale support without error handling. Pre-existing i18n issue.
- [x] [Review][Defer] Theme context not wrapped in error boundary [frontend/app/layout.tsx:33] — deferred, architectural decision — Whether to wrap ThemeProvider in error boundary requires broader architectural consideration about error handling strategy.
- [x] [Review][Defer] Theme context re-renders all children on toggle [frontend/app/lib/theme-context.tsx:59-63] — deferred, performance optimization — Context API behavior causes all children re-render on theme change. Requires memoization strategy evaluation.
- [x] [Review][Defer] Theme toggle function not debounced [frontend/app/lib/theme-context.tsx:50-52] — deferred, nice-to-have — Rapid clicks on toggle could cause multiple state updates. Debouncing is optimization, not critical.
- [x] [Review][Defer] Emergency alert high-contrast concerns [frontend/app/page.tsx:35-42] — deferred, requires user testing — Emergency alert uses destructive/10 background which may be too subtle in some themes. Requires UX testing to determine if visibility adequate.
## Suggested Review Order

**Core Theme System**

- ThemeContext with React Context state management and localStorage persistence
  [`../../frontend/app/lib/theme-context.tsx#L14`](../../frontend/app/lib/theme-context.tsx#L14)

- ThemeProvider wraps entire app with error handling for localStorage failures
  [`../../frontend/app/lib/theme-context.tsx#L14`](../../frontend/app/lib/theme-context.tsx#L14)

- Theme toggle button with accessibility and defensive error handling
  [`../../frontend/app/components/ThemeToggle.tsx#L8`](../../frontend/app/components/ThemeToggle.tsx#L8)

**Styling Foundation**

- CSS variables for comprehensive light/dark color palettes
  [`../../frontend/app/globals.css#L3`](../../frontend/app/globals.css#L3)

- Tailwind theme integration with CSS variables for utility classes
  [`../../frontend/app/globals.css#L20`](../../frontend/app/globals.css#L20)

- Theme transition support with reduced motion accessibility
  [`../../frontend/app/globals.css#L92`](../../frontend/app/globals.css#L92)

**Layout Integration**

- Root layout wraps app with ThemeProvider and header structure
  [`../../frontend/app/layout.tsx#L33`](../../frontend/app/layout.tsx#L33)

- Header provides theme toggle for consistent access across routes
  [`../../frontend/app/layout.tsx#L34`](../../frontend/app/layout.tsx#L34)

**Patient Interface**

- Patient form with theme-aware form controls and error states
  [`../../frontend/app/components/TriageForm.tsx#L48`](../../frontend/app/components/TriageForm.tsx#L48)

- Triage results maintain visual hierarchy with theme-aware colors
  [`../../frontend/app/components/TriageResult.tsx#L10`](../../frontend/app/components/TriageResult.tsx#L10)

- Medical disclaimer prominence preserved across both themes
  [`../../frontend/app/components/Disclaimer.tsx#L6`](../../frontend/app/components/Disclaimer.tsx#L6)

- Doctor card adapts styling for consistent card appearance
  [`../../frontend/app/components/DoctorCard.tsx#L9`](../../frontend/app/components/DoctorCard.tsx#L9)

- Patient page layout structure with theme-aware backgrounds
  [`../../frontend/app/page.tsx#L12`](../../frontend/app/page.tsx#L12)

**Nurse Dashboard**

- Triage queue table with theme-aware styling for readability
  [`../../frontend/app/dashboard/components/TriageQueue.tsx#L10`](../../frontend/app/dashboard/components/TriageQueue.tsx#L10)

- Queue item rows adapt with MTS level urgency signaling
  [`../../frontend/app/dashboard/components/TriageQueueItem.tsx#L15`](../../frontend/app/dashboard/components/TriageQueueItem.tsx#L15)

- Dashboard page structure with consistent theme application
  [`../../frontend/app/dashboard/page.tsx#L5`](../../frontend/app/dashboard/page.tsx#L5)
