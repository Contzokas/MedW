"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import SymptomWizard from "@/app/components/SymptomWizard"
import SkeletonTriageResult from "@/app/components/SkeletonTriageResult"
import FollowUpGuidance from "@/app/components/FollowUpGuidance"
import HistoryList from "@/app/components/HistoryList"
import Disclaimer from "@/app/components/Disclaimer"
import TeamSection from "@/app/components/TeamSection"
import OnboardingTour from "@/app/components/OnboardingTour"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"
import { useOnboarding } from "@/app/lib/useOnboarding"
import { useGeolocation } from "@/app/lib/useGeolocation"

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
  const searchParams = useSearchParams()
  const showHistory = searchParams.get("history") === "1"
  const [result, setResult] = useState<TriageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [useWizard, setUseWizard] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { t, lang } = useLang()
  const onboarding = useOnboarding(4)
  const geo = useGeolocation()

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
          <div className={`w-full ${result === null ? (useWizard ? "max-w-3xl" : "max-w-xl") : "max-w-2xl"}`}>
            {/* Logo */}
            <div className="mb-8 text-center">
              <button
                onClick={() => { setResult(null); setLoading(false) }}
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

              {showHistory ? (
                <HistoryList patientId={patientId} />
              ) : loading ? (
                <SkeletonTriageResult />
              ) : result === null ? (
                <div key={useWizard ? "wizard" : "text"} className="animate-[fadeIn_200ms_ease-out]">
                {useWizard ? (
                  <SymptomWizard patientId={patientId} onResult={handleResult} onStartLoading={handleStartLoading} latitude={geo.latitude} longitude={geo.longitude} />
                ) : (
                  <TriageForm onResult={handleResult} onStartLoading={handleStartLoading} patientId={patientId} latitude={geo.latitude} longitude={geo.longitude} geoDenied={geo.denied} geoLoading={geo.loading} geoDismissed={geo.dismissed} onRequestLocation={geo.request} />
                )}
                </div>
              ) : (
                <>
                  <TriageResult result={result} userLat={geo.latitude} userLon={geo.longitude} />
                  <FollowUpGuidance mtsLevel={result.mts_level} />

                  {geo.latitude === null && (
                    <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <span className="text-sm text-muted-foreground flex-1">{t.doctor.locationBanner}</span>
                      <button
                        type="button"
                        onClick={geo.request}
                        disabled={geo.loading}
                        className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
                      >
                        {geo.loading ? "..." : t.doctor.enableLocation}
                      </button>
                      <button
                        type="button"
                        onClick={geo.dismiss}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t.doctor.skipLocation}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Mode switcher — pill toggle between free-text and wizard */}
              {!showHistory && result === null && !loading && (
                <div className="flex gap-2 rounded-xl bg-muted/60 p-1.5 mt-2 mb-4">
                  <button
                    id="mode-text"
                    type="button"
                    onClick={() => setUseWizard(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                      !useWizard
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.45)]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    {toCaps(lang === "el" ? "Ελεύθερο Κείμενο" : "Free Text", lang)}
                  </button>
                  <button
                    id="mode-wizard"
                    type="button"
                    onClick={() => setUseWizard(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                      useWizard
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.45)]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                    {toCaps(lang === "el" ? "Καθοδηγούμενο" : "Guided", lang)}
                  </button>
                </div>
              )}
            </div>

            {/* Back button */}
            {result !== null && !showHistory && (
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
