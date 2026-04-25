"use client"

import { useState, useRef, useEffect } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import Disclaimer from "@/app/components/Disclaimer"
import TeamSection from "@/app/components/TeamSection"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const heroRef = useRef<HTMLElement>(null)
  const { t } = useLang()

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showDisclaimer = result !== null && heroVisible

  return (
    <>
      {/* ── Hero ── */}
      <section ref={heroRef} className="snap-section hero-section relative min-h-screen flex flex-col items-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hero-orb-1 absolute w-[680px] h-[680px] rounded-full -top-48 -left-24" />
          <div className="hero-orb-2 absolute w-[560px] h-[560px] rounded-full -bottom-36 -right-24" />
        </div>

        <div className="relative flex-1 w-full flex flex-col items-center justify-center py-16">
          <div className={`w-full ${result === null ? "max-w-xl" : "max-w-2xl"}`}>
            {/* Logo */}
            <div className="mb-8 text-center">
              <button
                onClick={() => setResult(null)}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                title={t.hero.logoTitle}
              >
                <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-foreground">
                  MED<span className="logo-omega text-primary transition-colors group-hover:text-primary-hover">Ω</span>
                </h1>
              </button>
              <p className="mt-3 text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground">
                {t.hero.subtitle}
              </p>
            </div>

            {/* Card */}
            <div className="triage-card rounded-2xl border border-primary/20 bg-card p-6 sm:p-8">
              {result === null ? (
                <TriageForm onResult={setResult} />
              ) : (
                <TriageResult result={result} />
              )}
            </div>

            {/* Back button */}
            {result !== null && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  {t.result.back}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#about"
          className="relative self-center flex flex-col items-center gap-1.5 pb-20 pt-4 text-muted-foreground/40 hover:text-primary transition-colors"
          aria-label={t.hero.scrollLabel}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">{t.hero.scroll}</span>
          <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </section>

      {/* Fixed disclaimer bar — above EmergencyBar, only while result is shown in hero */}
      <div
        role="note"
        aria-live="polite"
        className={`fixed inset-x-0 bottom-10 z-40 transition-all duration-300 ${
          showDisclaimer
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <Disclaimer />
      </div>

      <TeamSection />
    </>
  )
}
