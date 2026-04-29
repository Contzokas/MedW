"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import { useTriageStream } from "@/app/lib/useTriageStream"
import { resolveApiBase, buildApiUrl } from "@/app/lib/backendResolver"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface NimWarmup {
  enabled: boolean
  ready: boolean
  model: string
  timeout_seconds: number
  max_retries: number
  retry_delay_seconds: number
  in_progress: boolean
  attempts: number
  started_at: string | null
  last_attempt_at: string | null
  last_success_at: string | null
  last_error: string | null
}

interface NimStatusResponse {
  status: string
  warmup: NimWarmup
}

interface MtsBucket { mts_level: number; count: number }
interface SpecialtyBucket { specialty: string; count: number }
interface LangBucket { lang: string; count: number }

interface AnalyticsData {
  total_triages: number
  unique_patients: number
  avg_mts_level: number | null
  rag_percentage: number
  mts_distribution: MtsBucket[]
  specialty_distribution: SpecialtyBucket[]
  lang_distribution: LangBucket[]
}

interface DurationStats {
  min: number
  max: number
  mean: number
  median: number
  p95: number
}

interface RagDebugStats {
  trace_count?: number
  error_count?: number
  error_rate_pct?: number
  duration_stats_ms?: DurationStats
  distance_stats?: { min: number; max: number; mean: number }
  top_warnings?: Record<string, number>
  message?: string
}

const MTS_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-red-500",    text: "text-red-500",    label: "Immediate"   },
  2: { bg: "bg-orange-500", text: "text-orange-500", label: "Very Urgent" },
  3: { bg: "bg-yellow-500", text: "text-yellow-500", label: "Urgent"      },
  4: { bg: "bg-green-500",  text: "text-green-500",  label: "Less Urgent" },
  5: { bg: "bg-blue-500",   text: "text-blue-500",   label: "Non-Urgent"  },
}

const MTS_COLORS_EL: Record<number, string> = {
  1: "Άμεσο", 2: "Πολύ Επείγον", 3: "Επείγον", 4: "Τυπικό", 5: "Μη Επείγον",
}

const QUEUE_MTS_LABELS: Record<number, string> = {
  1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-Urgent",
}

const QUEUE_MTS_COLOR_CLASS: Record<number, string> = {
  1: "bg-destructive text-destructive-foreground",
  2: "bg-destructive text-destructive-foreground",
  3: "bg-warning text-background",
  4: "bg-success text-background",
  5: "bg-info text-background",
}

function Sparkline({ data, width, height, color }: { data: number[]; width: number; height: number; color: string }) {
  if (data.length < 2) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">—</div>
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ")
  return (
    <svg width={width} height={height} className="block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * height
        return <circle key={i} cx={x} cy={y} r={1.5} fill={color} />
      })}
    </svg>
  )
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-12 text-right text-muted-foreground flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-16 text-left text-foreground font-mono tabular-nums flex-shrink-0">{value.toFixed(0)}ms</span>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`triage-card rounded-2xl border border-primary/20 bg-card p-5 ${className ?? ""}`}>
      {children}
    </div>
  )
}

function ShimmerBlock({ height }: { height?: string }) {
  return <div className={`skeleton rounded-xl animate-pulse ${height ?? "h-32"}`} />
}

export default function ManagementPage() {
  const { lang } = useLang()

  const [nim, setNim] = useState<NimWarmup | null>(null)
  const [nimLoading, setNimLoading] = useState(true)

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const [ragStats, setRagStats] = useState<RagDebugStats | null>(null)
  const [ragLoading, setRagLoading] = useState(true)

  const [healthPings, setHealthPings] = useState<number[]>([])
  const [lastPing, setLastPing] = useState<number | null>(null)
  const maxPings = 40

  const queueEntries = useTriageStream()
  const [throughput, setThroughput] = useState<number[]>(Array(20).fill(0))
  const throughputInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const entryCountRef = useRef(0)

  useEffect(() => {
    entryCountRef.current = queueEntries.length
  }, [queueEntries])

  useEffect(() => {
    throughputInterval.current = setInterval(() => {
      setThroughput((prev) => {
        const next = [...prev.slice(1), entryCountRef.current]
        return next
      })
    }, 3000)
    return () => { if (throughputInterval.current) clearInterval(throughputInterval.current) }
  }, [])

  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      if (cancelled) return
      const start = performance.now()
      try {
        const base = await resolveApiBase()
        await fetch(buildApiUrl(base, "/api/v1/health"), { signal: AbortSignal.timeout(3000) })
        const duration = Math.round(performance.now() - start)
        if (!cancelled) {
          setLastPing(duration)
          setHealthPings((prev) => {
            const next = [...prev, duration].slice(-maxPings)
            return next
          })
        }
      } catch {
        if (!cancelled) {
          setLastPing(null)
          setHealthPings((prev) => [...prev, 0].slice(-maxPings))
        }
      }
    }

    ping()
    const interval = setInterval(ping, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    let cancelled = false
    resolveApiBase()
      .then((base) => fetch(buildApiUrl(base, "/api/v1/health/warmup")))
      .then((res) => res.json())
      .then((val: NimStatusResponse) => { if (!cancelled) { setNim(val.warmup); setNimLoading(false) } })
      .catch(() => { if (!cancelled) setNimLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    resolveApiBase()
      .then((base) => fetch(buildApiUrl(base, "/api/v1/analytics")))
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json() as Promise<AnalyticsData> })
      .then((val) => { if (!cancelled) { setAnalytics(val); setAnalyticsLoading(false) } })
      .catch(() => { if (!cancelled) setAnalyticsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    resolveApiBase()
      .then((base) => fetch(buildApiUrl(base, "/api/v1/rag/debug/stats")))
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json() as Promise<RagDebugStats> })
      .then((val) => { if (!cancelled) { setRagStats(val); setRagLoading(false) } })
      .catch(() => { if (!cancelled) setRagLoading(false) })
    return () => { cancelled = true }
  }, [])

  const queueCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    queueEntries.forEach((e) => {
      if (counts[e.mts_level] !== undefined) counts[e.mts_level]++
    })
    return counts
  }, [queueEntries])

  const avgPing = useMemo(() => {
    const valid = healthPings.filter((p) => p > 0)
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
  }, [healthPings])

  const throughputDelta = useMemo(() => {
    if (throughput.length < 2) return 0
    return throughput[throughput.length - 1] - throughput[throughput.length - 2]
  }, [throughput])

  return (
    <div className="hero-section relative min-h-screen flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-orb-1 absolute w-[600px] h-[600px] rounded-full -top-32 -left-16" />
        <div className="hero-orb-2 absolute w-[480px] h-[480px] rounded-full -bottom-24 -right-16" />
      </div>

      <div className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg transition-colors hover:bg-card/80"
              aria-label="Back to home"
            >
              <svg className="w-[16px] h-[16px] text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-foreground">
              MED<span className="logo-omega text-primary">Ω</span>
            </h1>
          </div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase hidden sm:block">
            Management
          </p>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span className={`inline-block w-2 h-2 rounded-full ${healthPings.length > 0 && healthPings[healthPings.length - 1] > 0 ? "bg-success" : "bg-destructive"}`} />
            {lastPing !== null ? `${lastPing}ms` : "—"}
          </div>
        </div>

        {/* ─── Row 1: Status Gauges (4 cols) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">NIM Status</p>
            {nimLoading ? (
              <ShimmerBlock height="h-16" />
            ) : nim ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${nim.ready ? "bg-success" : nim.in_progress ? "bg-warning" : "bg-destructive"}`} />
                  <span className="text-lg font-black text-foreground">{nim.ready ? "Ready" : nim.in_progress ? "Warming" : "Down"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{nim.model.split("/").pop()}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unreachable</p>
            )}
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">Health Ping</p>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-foreground">{avgPing ?? "—"}</span>
                <span className="text-[10px] text-muted-foreground">{avgPing !== null ? "ms avg" : ""}</span>
              </div>
              <div className="h-8 mt-1">
                <Sparkline data={healthPings} width={120} height={32} color="#3b82f6" />
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">Throughput</p>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-foreground">{queueEntries.length}</span>
                <span className="text-[10px] text-muted-foreground">total</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {throughputDelta > 0 ? `+${throughputDelta} / 3s` : throughputDelta < 0 ? `${throughputDelta} / 3s` : "steady"}
              </p>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">Total Triages</p>
            {analyticsLoading ? (
              <ShimmerBlock height="h-16" />
            ) : (
              <div>
                <span className="text-lg font-black text-foreground">{analytics?.total_triages?.toLocaleString() ?? 0}</span>
                <p className="text-[10px] text-muted-foreground">{analytics?.unique_patients ?? 0} patients</p>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Row 2: Latency Sparkline + Pipeline Stats (2 cols) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">API Latency (last {maxPings} pings)</p>
            <div className="h-20">
              <Sparkline data={healthPings} width={400} height={80} color="#3b82f6" />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>min: {healthPings.filter((p) => p > 0).length > 0 ? Math.min(...healthPings.filter((p) => p > 0)) : "—"}ms</span>
              <span>max: {healthPings.filter((p) => p > 0).length > 0 ? Math.max(...healthPings.filter((p) => p > 0)) : "—"}ms</span>
              <span>avg: {avgPing ?? "—"}ms</span>
              <span>pings: {healthPings.filter((p) => p > 0).length}</span>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">NIM Pipeline Duration</p>
            {ragLoading ? (
              <ShimmerBlock height="h-20" />
            ) : ragStats?.duration_stats_ms ? (
              <div className="space-y-1.5">
                <HorizontalBar label="p95" value={ragStats.duration_stats_ms.p95} max={ragStats.duration_stats_ms.max} color="#ef4444" />
                <HorizontalBar label="median" value={ragStats.duration_stats_ms.median} max={ragStats.duration_stats_ms.max} color="#f59e0b" />
                <HorizontalBar label="mean" value={ragStats.duration_stats_ms.mean} max={ragStats.duration_stats_ms.max} color="#3b82f6" />
                <HorizontalBar label="min" value={ragStats.duration_stats_ms.min} max={ragStats.duration_stats_ms.max} color="#22c55e" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{ragStats?.message ?? "No pipeline data"}</p>
            )}
            {ragStats?.error_count !== undefined && (
              <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                <span>Traces: {ragStats.trace_count}</span>
                <span>Errors: {ragStats.error_count} ({ragStats.error_rate_pct}%)</span>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Row 3: MTS Distribution + Top Specialties (2 cols) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-3">
              {toCaps("MTS Distribution", lang)}
            </p>
            {analyticsLoading ? (
              <ShimmerBlock height="h-28" />
            ) : analytics && analytics.total_triages > 0 ? (
              <div className="space-y-2">
                {analytics.mts_distribution.map((item) => {
                  const palette = MTS_COLORS[item.mts_level] ?? MTS_COLORS[5]
                  const pct = Math.max((item.count / analytics.total_triages) * 100, 0)
                  const label = lang === "el" ? MTS_COLORS_EL[item.mts_level] ?? `L${item.mts_level}` : `L${item.mts_level}`
                  return (
                    <div key={item.mts_level} className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${palette.bg}`} />
                      <span className="text-xs text-foreground w-16 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${palette.bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[11px] font-semibold tabular-nums w-10 text-right flex-shrink-0 ${palette.text}`}>{item.count}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-3">
              {toCaps("Top Specialties", lang)}
            </p>
            {analyticsLoading ? (
              <ShimmerBlock height="h-28" />
            ) : analytics && analytics.total_triages > 0 ? (
              <div className="space-y-1.5">
                {analytics.specialty_distribution.slice(0, 8).map((item, idx) => {
                  const pct = Math.max((item.count / analytics.total_triages) * 100, 0)
                  return (
                    <div key={item.specialty} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-3 text-right flex-shrink-0">{idx + 1}</span>
                      <span className="text-xs text-foreground truncate flex-1 min-w-0">{item.specialty}</span>
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        <div className="h-full rounded-full bg-info transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right flex-shrink-0 tabular-nums">{item.count}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </Card>
        </div>

        {/* ─── Row 4: Language + Queue MTS counts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">
              {toCaps("Language", lang)}
            </p>
            {analytics && analytics.lang_distribution.length > 0 ? (
              <div className="flex gap-2">
                {analytics.lang_distribution.map((item) => {
                  const pct = Math.round((item.count / analytics.total_triages) * 100)
                  return (
                    <div key={item.lang} className="flex-1 rounded-lg border border-border bg-muted/30 p-2 text-center">
                      <p className="text-lg font-black text-foreground">{pct}%</p>
                      <p className="text-[10px] text-muted-foreground">{item.lang === "en" ? "EN" : "EL"}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">
              {toCaps("Queue by Level", lang)}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((level) => {
                const palette = MTS_COLORS[level] ?? MTS_COLORS[5]
                return (
                  <div key={level} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                    <p className={`text-sm font-black ${palette.text}`}>{queueCounts[level] ?? 0}</p>
                    <p className="text-[9px] font-semibold text-muted-foreground">L{level}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-2">
              {toCaps("RAG Coverage", lang)}
            </p>
            {ragLoading ? (
              <ShimmerBlock height="h-16" />
            ) : ragStats?.distance_stats ? (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Chunk distance</span>
                  <span className="text-foreground font-mono">{ragStats.distance_stats.mean.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Min</span>
                  <span className="text-foreground font-mono">{ragStats.distance_stats.min.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Max</span>
                  <span className="text-foreground font-mono">{ragStats.distance_stats.max.toFixed(3)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{ragStats?.message ?? "No data"}</p>
            )}
          </Card>
        </div>

        {/* ─── Row 5: Live Triage Queue ─── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {toCaps("Live Triage Queue", lang)}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">{queueEntries.length} entries</span>
          </div>

          {queueEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No triage events recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Time</th>
                    <th className="text-left py-2 px-2 text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Patient ID</th>
                    <th className="text-left py-2 px-2 text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Level</th>
                    <th className="text-left py-2 px-2 text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Specialty</th>
                  </tr>
                </thead>
                <tbody>
                  {queueEntries.slice(0, 35).map((entry) => {
                    const badge = QUEUE_MTS_COLOR_CLASS[entry.mts_level] ?? "bg-gray-500 text-white"
                    const label = QUEUE_MTS_LABELS[entry.mts_level] ?? `L${entry.mts_level}`
                    const date = new Date(entry.timestamp)
                    const time = Number.isNaN(date.getTime())
                      ? "—"
                      : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    const rowBg = entry.mts_level <= 2 ? "bg-destructive/5" : ""
                    return (
                      <tr key={`${entry.patient_id}-${entry.timestamp}`} className={`border-b border-border/40 ${rowBg}`}>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground font-mono whitespace-nowrap">{time}</td>
                        <td className="py-1.5 px-2 text-[11px] text-foreground font-mono">{entry.patient_id.slice(0, 10)}...</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badge}`}>{label}</span>
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-foreground whitespace-nowrap">{entry.specialty}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {queueEntries.length > 35 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Showing 35 of {queueEntries.length} entries
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
