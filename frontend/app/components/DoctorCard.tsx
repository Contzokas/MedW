import { Doctor } from "@/app/lib/types"

interface DoctorCardProps {
  doctor: Doctor
  redirectUrl: string
}

export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-base font-medium text-muted-foreground">Recommended Doctor</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{doctor.name}</p>
      <p className="text-base text-foreground">{doctor.specialty}</p>

      {doctor.fallback_note !== null && (
        <p className="mt-2 text-base text-warning">
          ℹ️ {doctor.fallback_note}
        </p>
      )}

      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-base font-medium text-primary underline hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Find a doctor on finddoctors.gov.gr →
      </a>
    </div>
  )
}
