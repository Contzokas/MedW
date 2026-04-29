"use client"

import { useState, useRef, useEffect } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import Disclaimer from "@/app/components/Disclaimer"
import TeamSection from "@/app/components/TeamSection"
import ProfilerModal from "@/app/components/ProfilerModal"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { useProfile } from "@/app/lib/profile-context"
import { toCaps } from "@/app/lib/casing"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const [showProfiler, setShowProfiler] = useState(false)
  const [profilerIsEditing, setProfilerIsEditing] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { t, lang } = useLang()
  const { profile, isProfileLoaded } = useProfile()

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

  // Show modal only on first visit (no cookie found)
  useEffect(() => {
    if (isProfileLoaded && profile === null) {
      setProfilerIsEditing(false)
      setShowProfiler(true)
    }
  }, [isProfileLoaded, profile])

  const openEditProfiler = () => {
    setProfilerIsEditing(true)
    setShowProfiler(true)
  }

  const showDisclaimer = result !== null && heroVisible

  return (
    <>
      {/* ── Profiler Modal ── */}
      {showProfiler && (
        <ProfilerModal
          isEditing={profilerIsEditing}
          onClose={() => setShowProfiler(false)}
        />
      )}

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
              <p className="mt-3 text-xs font-medium tracking-[0.15em] text-muted-foreground">
                {toCaps(t.hero.subtitle, lang)}
              </p>
            </div>

            {/* Card */}
            <div className="triage-card rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 relative">
              {/* Edit profile button — top-right of card */}
              <button
                id="edit-profile-btn"
                type="button"
                onClick={openEditProfiler}
                title={t.profiler.editTitle}
                className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {profile ? t.profiler.editTitle : t.profiler.title}
              </button>

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
      <div id="page-bottom" className="h-px snap-end snap-always" aria-hidden="true" />

      {/* Back to top — visible only when hero is out of view (user is at the bottom) */}
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
    </>
  )
}
