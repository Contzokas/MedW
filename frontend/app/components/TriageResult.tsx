import Disclaimer from "@/app/components/Disclaimer"
import DoctorCard from "@/app/components/DoctorCard"
import { TriageResponse } from "@/app/lib/types"

interface TriageResultProps {
  result: TriageResponse
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-destructive text-destructive-foreground",
  2: "bg-destructive text-destructive-foreground",
  3: "bg-warning text-warning-foreground",
  4: "bg-success text-success-foreground",
  5: "bg-success text-success-foreground",
}

export default function TriageResult({ result }: TriageResultProps) {
  const mtsBadgeClass = MTS_COLORS[result.mts_level] ?? "bg-gray-500 text-white"

  return (
    <div className="space-y-6">
      <Disclaimer />

      <div className="flex items-center gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xl font-bold ${mtsBadgeClass}`}
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
        <p className="mt-1 text-base text-foreground leading-relaxed">{result.reasoning}</p>
      </div>
    </div>
  )
}
