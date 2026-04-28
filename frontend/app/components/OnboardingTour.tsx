"use client"

import { useEffect, useRef, useState } from "react"
import { useLang } from "@/app/lib/lang-context"

interface OnboardingTourProps {
  isOpen: boolean
  step: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

interface StepConfig {
  targetId?: string
  titleEn: string
  titleEl: string
  bodyEn: string
  bodyEl: string
}

const STEPS: StepConfig[] = [
  {
    titleEn: "Welcome to MEDΩ",
    titleEl: "Καλωσήρθατε στο MEDΩ",
    bodyEn:
      "Your AI-powered symptom assessment and medical triage assistant. Let us show you around in just a few steps.",
    bodyEl:
      "Ο βοηθός τεχνητής νοημοσύνης για αξιολόγηση συμπτωμάτων. Αφήστε μας να σας ξεναγήσουμε.",
  },
  {
    targetId: "symptoms",
    titleEn: "Describe Your Symptoms",
    titleEl: "Περιγράψτε τα Συμπτώματά σας",
    bodyEn:
      "Type your symptoms in plain language here — as much detail as you like. The AI will assess the urgency and guide you to the right care.",
    bodyEl:
      "Γράψτε τα συμπτώματά σας με απλά λόγια εδώ. Η τεχνητή νοημοσύνη θα αξιολογήσει την επείγουσα ανάγκη και θα σας καθοδηγήσει.",
  },
  {
    targetId: "wizard-toggle",
    titleEn: "Try the Symptom Wizard",
    titleEl: "Δοκιμάστε τον Οδηγό Συμπτωμάτων",
    bodyEn:
      "Prefer guided questions? Switch to the step-by-step wizard mode that walks you through body area, symptoms, and severity.",
    bodyEl:
      "Προτιμάτε καθοδηγημένες ερωτήσεις; Μεταβείτε στον οδηγό βήμα-βήμα.",
  },
  {
    targetId: "tab-history",
    titleEn: "Review Past Assessments",
    titleEl: "Δείτε Παλαιότερες Αξιολογήσεις",
    bodyEn:
      "All your previous triage results are saved locally. Switch to the History tab to review them anytime.",
    bodyEl:
      "Όλες οι προηγούμενες αξιολογήσεις αποθηκεύονται τοπικά. Μεταβείτε στην Ιστορικό για να τις δείτε.",
  },
]

const PADDING = 12

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

/** Measure the target element's viewport position for the spotlight box. */
function computeSpotlight(targetId: string): SpotlightRect | null {
  const el = document.getElementById(targetId)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  }
}

/** Compute card position relative to target element, clamped to viewport. */
function computeCardStyle(targetId: string | undefined): React.CSSProperties {
  if (!targetId) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(90vw, 400px)",
    }
  }
  const el = document.getElementById(targetId)
  if (!el) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(90vw, 400px)",
    }
  }

  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardWidth = Math.min(vw * 0.9, 380)
  const cardHeight = 220 // conservative estimate

  let left = rect.left + rect.width / 2 - cardWidth / 2
  left = Math.max(12, Math.min(left, vw - cardWidth - 12))

  const spaceBelow = vh - (rect.bottom + PADDING)
  let top: number
  if (spaceBelow >= cardHeight + 16) {
    top = rect.bottom + PADDING + 16
  } else {
    top = rect.top - PADDING - cardHeight - 16
  }
  top = Math.max(12, Math.min(top, vh - cardHeight - 12))

  return { top, left, width: cardWidth, transform: "none" }
}

export default function OnboardingTour({
  isOpen,
  step,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: OnboardingTourProps) {
  const { lang } = useLang()
  const cardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Positions are stored in state and computed after scroll settles in useEffect
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(90vw, 400px)",
  })

  const cfg = STEPS[step]
  const isLast = step === totalSteps - 1

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip()
      else if (e.key === "ArrowRight") onNext()
      else if (e.key === "ArrowLeft") onPrev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onNext, onPrev, onSkip])

  // ── Auto-focus first button on each step ────────────────────────────────
  useEffect(() => {
    if (isOpen && cardRef.current) {
      const firstBtn = cardRef.current.querySelector<HTMLElement>("button")
      firstBtn?.focus()
    }
  }, [isOpen, step])

  // ── Scroll target into view, then measure positions after scroll settles ─
  useEffect(() => {
    if (!isOpen) return

    const targetId = cfg?.targetId

    // Clear spotlight immediately on step change to avoid stale flash
    setSpotlightRect(null)

    if (targetId) {
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }

    // Wait for smooth-scroll to finish (~300ms), then measure
    const timerId = setTimeout(() => {
      if (targetId) {
        setSpotlightRect(computeSpotlight(targetId))
      }
      setCardStyle(computeCardStyle(targetId))
    }, 350)

    return () => clearTimeout(timerId)
  }, [isOpen, step, cfg?.targetId])

  // ── Recompute on viewport resize ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const targetId = cfg?.targetId
    const handler = () => {
      setSpotlightRect(targetId ? computeSpotlight(targetId) : null)
      setCardStyle(computeCardStyle(targetId))
    }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [isOpen, cfg?.targetId])

  if (!isOpen || !cfg) return null

  const title = lang === "el" ? cfg.titleEl : cfg.titleEn
  const body = lang === "el" ? cfg.bodyEl : cfg.bodyEn
  const hasTarget = !!cfg.targetId

  return (
    <div
      ref={overlayRef}
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={lang === "el" ? "Ξενάγηση εφαρμογής" : "Application tour"}
      onClick={(e) => {
        if (e.target === overlayRef.current) onSkip()
      }}
    >
      {/* Spotlight — rendered only once rect is measured */}
      {hasTarget && spotlightRect && (
        <div
          className="tour-spotlight"
          style={spotlightRect}
          aria-hidden="true"
        />
      )}

      {/* Tour card */}
      <div ref={cardRef} className="tour-card" style={cardStyle}>
        {/* Progress dots */}
        <div className="tour-dots" aria-hidden="true">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`tour-dot ${i === step ? "tour-dot--active" : ""}`}
            />
          ))}
        </div>

        <h2 className="tour-card__title">{title}</h2>
        <p className="tour-card__body">{body}</p>

        {/* Actions */}
        <div className="tour-card__actions">
          <button
            id="tour-skip-btn"
            type="button"
            onClick={onSkip}
            className="tour-btn tour-btn--ghost"
          >
            {lang === "el" ? "Παράλειψη" : "Skip"}
          </button>

          <div className="tour-card__nav">
            {step > 0 && (
              <button
                id="tour-prev-btn"
                type="button"
                onClick={onPrev}
                className="tour-btn tour-btn--secondary"
                aria-label={lang === "el" ? "Προηγούμενο" : "Previous"}
              >
                ←
              </button>
            )}
            <button
              id="tour-next-btn"
              type="button"
              onClick={onNext}
              className="tour-btn tour-btn--primary"
            >
              {isLast
                ? lang === "el"
                  ? "Τέλος"
                  : "Finish"
                : lang === "el"
                ? "Επόμενο →"
                : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
