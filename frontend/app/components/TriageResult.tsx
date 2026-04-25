"use client"

import Disclaimer from "@/app/components/Disclaimer"
import DoctorCard from "@/app/components/DoctorCard"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

interface TriageResultProps {
  result: TriageResponse
}

const MTS_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-destructive",  text: "text-white" },
  2: { bg: "bg-destructive",  text: "text-white" },
  3: { bg: "bg-amber-500",    text: "text-white" },
  4: { bg: "bg-emerald-500",  text: "text-white" },
  5: { bg: "bg-emerald-500",  text: "text-white" },
}

export default function TriageResult({ result }: TriageResultProps) {
  const { t } = useLang()
  const { bg, text } = MTS_COLORS[result.mts_level] ?? { bg: "bg-muted", text: "text-foreground" }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xl font-bold ${bg} ${text}`}
          aria-label={`Triage level ${result.mts_level}`}
        >
          {result.mts_level}
        </span>
        <div>
          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
            Urgency Level (MTS)
          </p>
          <p className="text-2xl font-bold text-foreground">{result.mts_label}</p>
        </div>
      </div>

      <div>
        <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
          Recommended Specialty
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">{result.specialty}</p>
      </div>

      <DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />

      <div>
        <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
          Reasoning
        </p>
        <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
      </div>

      <Disclaimer />
    </div>
  )
}
