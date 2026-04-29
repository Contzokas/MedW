"use client"

import { useLang } from "@/app/lib/lang-context"

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

const LOADING_STEPS = {
  en: ["Analyzing your symptoms...", "Consulting AI triage system...", "Generating assessment...", "Finalizing results..."],
  el: ["Ανάλυση των συμπτωμάτων σας...", "Συμβουλή με το σύστημα τριμαζ AI...", "Δημιουργία αξιολόγησης...", "Οριστικοποίηση αποτελεσμάτων..."]
}

export default function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { lang } = useLang()
  const steps = LOADING_STEPS[lang]

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
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-all duration-500"
                style={{
                  opacity: 0.4 + (index * 0.2),
                  transform: index === 0 ? "scale(1.05)" : "scale(1)"
                }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-[loadingProgress_2s_ease-in-out_infinite]" style={{ width: "30%" }} />
        </div>
      </div>
    </div>
  )
}