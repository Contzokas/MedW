"use client"

import { Doctor } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

interface DoctorCardProps {
  doctor: Doctor
  redirectUrl: string
}

export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
  const { t } = useLang()

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-base font-medium text-muted-foreground">Recommended Doctor</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{doctor.name}</p>
      <p className="text-sm text-foreground">{doctor.specialty}</p>

      {doctor.fallback_note !== null && (
        <p className="mt-2 text-sm text-warning">ℹ️ {doctor.fallback_note}</p>
      )}

      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 hover:border-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Find a doctor on finddoctors.gov.gr →
      </a>
    </div>
  )
}
