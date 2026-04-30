"use client"

import { useEffect, useState } from "react"
import { useLang } from "@/app/lib/lang-context"

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

const LOADING_STEPS = {
  en: ["Analyzing your symptoms...", "Consulting AI triage system...", "Generating assessment...", "Finalizing results..."],
  el: ["Ανάλυση των συμπτωμάτων σας...", "Συμβουλή με το σύστημα τριάζ AI...", "Δημιουργία αξιολόγησης...", "Οριστικοποίηση αποτελεσμάτων..."]
}

const STEP_DELAY_MS = 800

export default function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { lang } = useLang()
  const steps = LOADING_STEPS[lang]
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!visible) {
      setActiveStep(0)
      return
    }
    setActiveStep(0)
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, STEP_DELAY_MS)
    return () => clearInterval(timer)
  }, [visible, steps.length])

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
        {/* Animated spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-2 border-4 border-primary/40 rounded-full border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
        </div>

        {/* Loading message */}
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">
            {message || (lang === "el" ? "Επεξεργασία..." : "Processing...")}
          </p>

          {/* Animated steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isActive = index === activeStep
              const isDone = index < activeStep
              return (
                <div
                  key={index}
                  className={`flex items-center justify-center gap-2 text-sm transition-all duration-500 ${
                    isActive
                      ? "text-foreground scale-105"
                      : isDone
                        ? "text-foreground/70"
                        : "text-muted-foreground/40"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      isActive ? "bg-primary animate-pulse scale-125" : isDone ? "bg-primary/60" : "bg-muted-foreground/30"
                    }`}
                  />
                  {step}
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}