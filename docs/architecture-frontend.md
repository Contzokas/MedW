# Architecture — Frontend (Next.js)

> Generated: 2026-04-26 | Part: `frontend` | Framework: Next.js 16.2.4 / React 19.2.4

---

## Executive Summary

Patient-facing Next.js 16 application with two routes: a triage page (`/`) where patients submit symptoms and receive AI-powered MTS classification, and a nurse dashboard (`/dashboard`) displaying real-time triage queue updates via Server-Sent Events. Features bilingual support (EN/EL), dark/light theme, and a runtime-configurable backend proxy.

---

## Architecture Pattern

**Next.js App Router** with component-based architecture.

- **Routing:** File-based routing via `app/` directory
- **State Management:** React Context (Theme, Language) — no Redux/Zustand
- **Data Fetching:** Client-side API calls via `fetch()` wrapper
- **Real-time:** EventSource (SSE) custom hook
- **Styling:** Tailwind CSS v4 with CSS custom properties for theming
- **i18n:** In-file translations object (not a framework)

---

## Component Architecture

### Provider Composition

```
layout.tsx
└── ThemeProvider (localStorage, system preference detection)
    └── LangProvider (EN/EL toggle state)
        └── {children}
```

### Client-Side Hooks

| Hook | Purpose | Implementation |
|---|---|---|
| `useLang()` | Access current language and translation strings | React Context + translations object |
| `useTheme()` | Access theme state | React Context + localStorage + `data-theme` attribute |
| `useTriageStream()` | Real-time queue updates | EventSource to `/api/proxy/api/v1/triage/queue` |

---

## Backend Communication

### API Client

`lib/api.ts` exports `submitTriage()` which POSTs to `/api/v1/triage`.

### Backend URL Resolution

`lib/backendResolver.ts` implements a 3-tier resolution strategy:

1. **Runtime config** — Fetch `/api/config` for `BACKEND_URL` env var (2min TTL cache)
2. **Direct** — Use `NEXT_PUBLIC_BACKEND_URL` if set (port-forward scenarios)
3. **Proxy** — Fall back to `/api/proxy/[...path]` (production)

### API Proxy Route

`app/api/proxy/[...path]/route.ts` forwards all HTTP methods to the backend. Reads `BACKEND_URL` at runtime. Forwards headers (excluding `host`). 5-second timeout with 307 redirect fallback.

---

## Styling Architecture

- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **CSS Custom Properties** in `globals.css` for theme variables
- **Dark mode:** `[data-theme="dark"]` attribute on `<html>` element
- **Scroll snap** on landing page sections
- **MTS color coding:** Red (1) → Orange (2) → Yellow (3) → Green (4) → Blue (5)
- **Responsive:** Mobile-first with Tailwind breakpoints

---

## Internationalization

No i18n framework — translations are a TypeScript object in `lib/translations.ts` with `satisfies` assertion for type safety. The `toCaps()` utility handles Greek-aware uppercase conversion (accent handling).

---

## Build & Output

- **Output mode:** `standalone` (for Docker deployment)
- **Dockerfile:** Multi-stage build (node:20-alpine builder → standalone runner)
- **Dev server:** `npm run dev` (port 3000)
