import Disclaimer from "@/app/components/Disclaimer"
import DoctorCard from "@/app/components/DoctorCard"
import { TriageResponse } from "@/app/lib/types"

interface TriageResultProps {
  result: TriageResponse
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-red-600 text-white",
  3: "bg-orange-500 text-white",
  4: "bg-green-600 text-white",
  5: "bg-green-600 text-white",
}

export default function TriageResult({ result }: TriageResultProps) {
  const mtsBadgeClass = MTS_COLORS[result.mts_level] ?? "bg-gray-500 text-white"

  return (
    <div className="space-y-6">
      <Disclaimer />

      <div className="flex items-center gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xl font-bold ${mtsBadgeClass}`}
          aria-label={`Επίπεδο τριάζ ${result.mts_level}`}
        >
          {result.mts_level}
        </span>
        <div>
          <p className="text-base font-medium uppercase tracking-wide text-gray-500">
            Επίπεδο Επείγοντος (MTS)
          </p>
          <p className="text-2xl font-bold text-gray-900">{result.mts_label}</p>
        </div>
      </div>

      <div>
        <p className="text-base font-medium uppercase tracking-wide text-gray-500">
          Συνιστώμενη Ειδικότητα
        </p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{result.specialty}</p>
      </div>

      <DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />

      <div>
        <p className="text-base font-medium uppercase tracking-wide text-gray-500">
          Αιτιολόγηση
        </p>
        <p className="mt-1 text-base text-gray-700 leading-relaxed">{result.reasoning}</p>
      </div>
    </div>
  )
}
