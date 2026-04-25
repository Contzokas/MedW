"use client"

import { useState } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import Disclaimer from "@/app/components/Disclaimer"
import TeamSection from "@/app/components/TeamSection"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)
  const { t } = useLang()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <button
            onClick={() => setResult(null)}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            title="Back to home"
          >
            MED<span className="text-primary">Ω</span>
          </button>
          <p className="mt-6 text-xl font-medium text-foreground">
            Intelligent symptom assessment and guidance system
          </p>
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

            {/* Back button + disclaimer */}
            {result !== null && (
              <div className="mt-4 space-y-3">
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
                <Disclaimer />
              </div>
            )}

            <div className="mt-10 rounded-2xl border-2 border-destructive/20 bg-destructive/10 p-6 text-center shadow-sm">
              <p className="text-lg font-medium text-destructive">
                In case of a life-threatening emergency, call
              </p>
              <p className="mt-2 text-4xl font-black tracking-widest text-destructive">
                112
              </p>
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
          </div>
        </div>

        <TeamSection />
      </div>
    </main>
  )
}
