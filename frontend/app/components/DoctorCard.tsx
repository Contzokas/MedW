"use client"

import { Doctor } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

interface DoctorCardProps {
  doctor: Doctor
  redirectUrl: string
  userLat: number | null
  userLon: number | null
}

export default function DoctorCard({ doctor, redirectUrl, userLat, userLon }: DoctorCardProps) {
  const { t } = useLang()

  const showDistance = userLat !== null && userLon !== null && doctor.lat !== null && doctor.lon !== null
  const distanceKm = showDistance ? haversineKm(userLat, userLon, doctor.lat!, doctor.lon!).toFixed(1) : null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{toCaps(t.doctor.label, "el")}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{doctor.name}</p>
      <p className="text-sm text-foreground">{doctor.specialty}</p>

      {doctor.city && (
        <p className="mt-0.5 text-sm text-muted-foreground">{doctor.city}</p>
      )}

      {distanceKm !== null && (
        <p className="text-sm text-muted-foreground">
          {t.doctor.distance.replace("{km}", distanceKm)}
        </p>
      )}

      {doctor.fallback_note !== null && (
        <p className="mt-2 text-sm text-warning">ℹ️ {doctor.fallback_note}</p>
      )}

      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 hover:border-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {t.doctor.link}
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  )
}
