"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import SymptomWizard from "@/app/components/SymptomWizard"
import SkeletonTriageResult from "@/app/components/SkeletonTriageResult"
import FollowUpGuidance from "@/app/components/FollowUpGuidance"
import Tabs from "@/app/components/Tabs"
import HistoryList from "@/app/components/HistoryList"
import Disclaimer from "@/app/components/Disclaimer"
import TeamSection from "@/app/components/TeamSection"
import OnboardingTour from "@/app/components/OnboardingTour"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"
import { useOnboarding } from "@/app/lib/useOnboarding"

function generatePatientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID() } catch { /* insecure context */ }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [activeTab, setActiveTab] = useState<"form" | "history">("form")
  const [useWizard, setUseWizard] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { t, lang } = useLang()
  const onboarding = useOnboarding(4)

  const [patientId] = useState(() => {
    try {
      return localStorage.getItem("medw_patient_id") || generatePatientId()
    } catch {
      return generatePatientId()
    }
  })

  useEffect(() => {
    try {
      const existing = localStorage.getItem("medw_patient_id")
      if (!existing) {
        localStorage.setItem("medw_patient_id", patientId)
      }
    } catch { /* localStorage unavailable */ }
  }, [patientId])

  const handleStartLoading = () => setLoading(true)

  const handleResult = (r: TriageResponse) => {
    setResult(r)
    setLoading(false)
  }

  const tabs = useMemo(
    () => [
      { id: "form", label: t.history.newAssessment },
      { id: "history", label: t.history.title, tabId: "tab-history" },
    ],
    [t.history.newAssessment, t.history.title]
  )

  const scrollToBottom = () => {
    const bottomAnchor = document.getElementById("page-bottom")
    if (bottomAnchor) {
      bottomAnchor.scrollIntoView({ behavior: "smooth", block: "end" })
      return
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })
  }

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
                onClick={() => { setResult(null); setLoading(false); setActiveTab("form") }}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                title={t.hero.logoTitle}
              >
                <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-foreground">
                  MED<span className="logo-omega text-primary transition-colors group-hover:text-primary-hover">Ω</span>
                </h1>
              </button>
              <p className="mt-3 text-xs font-medium tracking-[0.15em] text-muted-foreground">
                {toCaps(t.hero.subtitle, lang)}
              </p>
            </div>

            {/* Card */}
            <div className="triage-card rounded-2xl border border-primary/20 bg-card p-6 sm:p-8">
              <div className="mb-6">
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={(id) => setActiveTab(id as "form" | "history")}
                />
              </div>

              {activeTab === "history" ? (
                <HistoryList patientId={patientId} />
              ) : loading ? (
                <SkeletonTriageResult />
              ) : result === null ? (
                useWizard ? (
                  <SymptomWizard patientId={patientId} onResult={handleResult} onStartLoading={handleStartLoading} />
                ) : (
                  <TriageForm onResult={handleResult} onStartLoading={handleStartLoading} patientId={patientId} />
                )
              ) : (
                <>
                  <TriageResult result={result} />
                  <FollowUpGuidance mtsLevel={result.mts_level} />
                </>
              )}

              {/* Wizard / free-text toggle */}
              {activeTab === "form" && result === null && !loading && (
                <button
                  id="wizard-toggle"
                  type="button"
                  onClick={() => setUseWizard(!useWizard)}
                  className="mt-4 block mx-auto text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  {useWizard ? t.wizard.freeText : t.wizard.tryWizardLink}
                </button>
              )}
            </div>

            {/* Back button */}
            {result !== null && activeTab === "form" && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => { setResult(null); setLoading(false) }}
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
        <button
          type="button"
          onClick={scrollToBottom}
          className="relative self-center flex flex-col items-center gap-1.5 pb-20 pt-4 text-muted-foreground/40 hover:text-primary transition-colors"
          aria-label={t.hero.scrollLabel}
        >
          <span className="text-[10px] font-semibold tracking-[0.25em]">{toCaps(t.hero.scroll, lang)}</span>
          <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </section>

      {/* Fixed disclaimer bar */}
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
      <div id="page-bottom" className="h-px snap-end snap-always" aria-hidden="true" />

      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`fixed bottom-12 right-4 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-all duration-300 ${
          !heroVisible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Onboarding tour */}
      <OnboardingTour
        isOpen={onboarding.isOpen}
        step={onboarding.step}
        totalSteps={onboarding.totalSteps}
        onNext={onboarding.next}
        onPrev={onboarding.prev}
        onSkip={onboarding.skip}
      />
    </>
  )
}
