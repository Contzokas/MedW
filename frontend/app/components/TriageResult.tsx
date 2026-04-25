"use client"

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
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left col: MTS level + specialty */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span
              className={`w-14 h-14 shrink-0 inline-flex items-center justify-center rounded-full text-2xl font-black ${bg} ${text}`}
              aria-label={`Triage level ${result.mts_level}`}
            >
              {result.mts_level}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t.result.mtsLabel}
              </p>
              <p className="text-xl font-bold text-foreground">{result.mts_label}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t.result.specialty}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">{result.specialty}</p>
          </div>
        </div>

        {/* Right col: doctor card */}
        <DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />
      </div>

      {/* Reasoning */}
      <div className="border-t border-border pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          {t.result.reasoning}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
      </div>
    </div>
  )
}
