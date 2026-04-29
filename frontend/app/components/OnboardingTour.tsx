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
  centerCard?: boolean
  titleEn: string
  titleEl: string
  bodyEn: string
  bodyEl: string
}

const STEPS: StepConfig[] = [
  {
    targetId: "medw-logo",
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
      "Type your symptoms here in plain language — be as detailed as you like. The AI will assess urgency and guide you to the right level of care.",
    bodyEl:
      "Γράψτε τα συμπτώματά σας εδώ με απλά λόγια — όσο πιο λεπτομερή γίνεται. Η τεχνητή νοημοσύνη θα αξιολογήσει την επείγουσα ανάγκη.",
  },
  {
    targetId: "wizard-toggle",
    titleEn: "Choose Your Input Mode",
    titleEl: "Επιλέξτε Τρόπο Εισαγωγής",
    bodyEn:
      "Toggle between free-text (type anything) and the guided wizard (step-by-step with body area, symptoms, and severity). Pick whichever feels more comfortable.",
    bodyEl:
      "Εναλλάξτε μεταξύ ελεύθερου κειμένου και καθοδηγούμενου οδηγού βήμα-βήμα. Επιλέξτε ό,τι σας βολεύει περισσότερο.",
  },
  {
    targetId: "tab-history",
    titleEn: "Access Your History",
    titleEl: "Δείτε το Ιστορικό σας",
    bodyEn:
      "Tap the clock icon anytime to review your past assessments. All results are saved locally on your device — nothing leaves your browser.",
    bodyEl:
      "Πατήστε το εικονίδιο ρολογιού για να δείτε προηγούμενες αξιολογήσεις. Όλα αποθηκεύονται τοπικά στη συσκευή σας.",
  },
]

const PADDING = 8

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
function computeCardStyle(targetId: string | undefined, centerCard?: boolean): React.CSSProperties {
  if (!targetId || centerCard) {
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
  const cardHeight = 220

  let left = rect.left + rect.width / 2 - cardWidth / 2
  left = Math.max(12, Math.min(left, vw - cardWidth - 12))

  // Prefer above the target to avoid page scroll
  const spaceAbove = rect.top - PADDING
  let top: number
  if (spaceAbove >= cardHeight + 16) {
    top = rect.top - PADDING - cardHeight - 16
  } else {
    top = rect.bottom + PADDING + 16
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

    if (targetId) {
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" })
      }
    }

    // Measure immediately — no smooth-scroll delay needed
    const timerId = setTimeout(() => {
      if (targetId) {
        setSpotlightRect(computeSpotlight(targetId))
      }
      setCardStyle(computeCardStyle(targetId, cfg?.centerCard))
    }, 50)

    return () => clearTimeout(timerId)
  }, [isOpen, step, cfg?.targetId])

  // ── Recompute on viewport resize ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const targetId = cfg?.targetId
    const handler = () => {
      setSpotlightRect(targetId ? computeSpotlight(targetId) : null)
      setCardStyle(computeCardStyle(targetId, cfg?.centerCard))
    }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [isOpen, cfg?.targetId, cfg?.centerCard])

  if (!isOpen || !cfg) return null

  const title = lang === "el" ? cfg.titleEl : cfg.titleEn
  const body = lang === "el" ? cfg.bodyEl : cfg.bodyEn
  const hasTarget = !!cfg.targetId

  // ── Spotlight clip-path: punches a hole in the overlay ──────────────
  const clipPathValue =
    spotlightRect
      ? `polygon(
          0% 0%, 0% 100%, 100% 100%, 100% 0%,
          0% 0%,
          ${spotlightRect.left}px ${spotlightRect.top}px,
          ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top}px,
          ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top + spotlightRect.height}px,
          ${spotlightRect.left}px ${spotlightRect.top + spotlightRect.height}px,
          ${spotlightRect.left}px ${spotlightRect.top}px
        )`
      : undefined

  return (
    <>
      {/* Darkened blurred overlay with spotlight hole (card & ring are siblings, not children) */}
      <div
        ref={overlayRef}
        className="tour-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={lang === "el" ? "Ξενάγηση εφαρμογής" : "Application tour"}
        onClick={onSkip}
        style={clipPathValue ? { clipPath: clipPathValue, WebkitClipPath: clipPathValue } : undefined}
      />

      {/* Spotlight blue ring — outside overlay so it stays fully visible */}
      {hasTarget && spotlightRect && (
        <div
          className="tour-spotlight-ring"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tour card — outside overlay so it's never clipped */}
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
    </>
  )
}
