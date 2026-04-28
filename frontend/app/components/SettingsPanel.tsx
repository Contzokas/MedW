"use client"

import Link from "next/link"
import { useLang } from "@/app/lib/lang-context"
import { useTheme } from "@/app/lib/theme-context"
import { usePWA } from "@/app/lib/usePWA"

export default function SettingsPanel() {
  const { lang, t, toggleLang } = useLang()
  const { theme, setTheme } = useTheme()
  const { canInstall, isInstalled, isIOS, install } = usePWA()

  const handleReplayTour = () => {
    try { localStorage.removeItem("medw_onboarding_done") } catch { /* noop */ }
  }

  const installLabel = lang === "el" ? "Εγκατάσταση Εφαρμογής" : "Install App"
  const installHintBrave = lang === "el"
    ? "Κάντε κλικ στο εικονίδιο εγκατάστασης στη γραμμή διευθύνσεων του Brave."
    : "Click the install icon (⊕) in Brave's address bar to add MEDΩ to your desktop."
  const installHintIOS = lang === "el"
    ? 'Πατήστε "Κοινοποίηση" και μετά "Προσθήκη στην οθόνη Αρχικής".'
    : 'Tap the Share button then "Add to Home Screen".'
  const installedLabel = lang === "el" ? "Η εφαρμογή είναι εγκατεστημένη ✓" : "App already installed ✓"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-11 h-11 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors hover:bg-card/80"
            aria-label={t.settings.back}
          >
            <svg
              className="w-[18px] h-[18px] text-foreground/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t.settings.title}
          </h1>
        </div>

        {/* Language Section */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-3">
            {t.settings.language}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { if (lang !== "en") toggleLang() }}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
                lang === "en"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => { if (lang !== "el") toggleLang() }}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
                lang === "el"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
              }`}
            >
              EL
            </button>
          </div>
        </section>

        {/* Theme Section */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-3">
            {t.settings.theme}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
              }`}
            >
              <svg
                className="w-5 h-5 mx-auto mb-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
              {t.settings.light}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
              }`}
            >
              <svg
                className="w-5 h-5 mx-auto mb-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {t.settings.dark}
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
                theme === "system"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
              }`}
            >
              <svg
                className="w-5 h-5 mx-auto mb-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
              </svg>
              {t.settings.system}
            </button>
          </div>
        </section>
        {/* Install App Section */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-3">
            {installLabel}
          </p>
          {isInstalled ? (
            <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              {installedLabel}
            </div>
          ) : canInstall ? (
            <button
              id="settings-install-btn"
              type="button"
              onClick={install}
              className="w-full flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {installLabel}
            </button>
          ) : isIOS ? (
            <div className="rounded-xl border-2 border-border/50 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
              <p>{installHintIOS}</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-border/50 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
              <p>{installHintBrave}</p>
            </div>
          )}
        </section>

        {/* Tour Section */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-3">
            {lang === "el" ? "Ξενάγηση" : "Tour"}
          </p>
          <Link
            href="/"
            onClick={handleReplayTour}
            id="settings-replay-tour"
            className="flex items-center gap-3 rounded-xl border-2 border-border/50 bg-card/60 px-4 py-3 text-sm font-semibold text-muted-foreground hover:border-border hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
            </svg>
            {t.settings.replayTour}
          </Link>
        </section>
      </div>
    </div>
  )
}
