"use client"

import { MTS_GUIDANCE } from "@/app/lib/followup-guidance"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface FollowUpGuidanceProps {
  mtsLevel: number
}

export default function FollowUpGuidance({ mtsLevel }: FollowUpGuidanceProps) {
  const { t, lang } = useLang()
  const steps = MTS_GUIDANCE[mtsLevel]

  if (!steps || steps.length === 0) return null

  const isUrgent = mtsLevel <= 2

  return (
    <div
      role="region"
      aria-label={lang === "el" ? "Οδηγίες επόμενων βημάτων" : "Follow-up guidance"}
      className={`mt-5 rounded-lg p-4 space-y-3 ${
        isUrgent
          ? "bg-destructive/5 border-l-4 border-destructive"
          : "bg-muted/50"
      }`}
    >
      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
        {toCaps(t.guidance.title, lang)}
      </p>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {lang === "el" ? step.title_el : step.title_en}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lang === "el" ? step.description_el : step.description_en}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
