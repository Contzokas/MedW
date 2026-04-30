"use client"

import { useState, useEffect } from "react"
import { TriageHistoryEntry, TriageHistoryList as HistoryListType } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface HistoryListProps {
  patientId: string
}

function mtsColor(level: number): string {
  const colors: Record<number, string> = {
    1: "bg-red-600",
    2: "bg-orange-500",
    3: "bg-amber-500",
    4: "bg-blue-500",
    5: "bg-emerald-500",
  }
  return colors[level] ?? "bg-slate-400"
}

export default function HistoryList({ patientId }: HistoryListProps) {
  const [entries, setEntries] = useState<TriageHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useLang()

  useEffect(() => {
    let cancelled = false
    async function fetchHistory() {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""
        const res = await fetch(`${base}/api/v1/triage/history/${encodeURIComponent(patientId)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: HistoryListType = await res.json()
        if (!cancelled) {
          setEntries(data.entries)
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load history")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [patientId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {lang === "el" ? "Δεν υπάρχουν προηγούμενες αξιολογήσεις." : "No previous assessments."}
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <h2 className="text-sm font-bold text-foreground/80 tracking-wide">
        {toCaps(lang === "el" ? "Ιστορικό Αξιολογήσεων" : "Assessment History", lang)}
      </h2>
      {entries.map((entry, i) => (
        <div key={entry.id ?? i} className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${mtsColor(entry.mts_level)}`}>
              MTS {entry.mts_level}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(entry.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-GB")}
            </span>
          </div>
          <p className="text-xs text-foreground/80 line-clamp-2">{entry.symptoms}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{entry.mts_label}</span>
            <span>·</span>
            <span>{entry.specialty}</span>
            {entry.doctor_name && (
              <>
                <span>·</span>
                <span>{entry.doctor_name}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
