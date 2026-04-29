"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/lib/lang-context";
import { resolveApiBase, buildApiUrl } from "@/app/lib/backendResolver";

interface MtsBucket { mts_level: number; count: number }
interface SpecialtyBucket { specialty: string; count: number }
interface LangBucket { lang: string; count: number }

interface AnalyticsData {
  total_triages: number;
  unique_patients: number;
  avg_mts_level: number | null;
  rag_percentage: number;
  mts_distribution: MtsBucket[];
  specialty_distribution: SpecialtyBucket[];
  lang_distribution: LangBucket[];
}

// MTS level → colour token matching the rest of the app
const MTS_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-red-500",    text: "text-red-500",    label: "Immediate"   },
  2: { bg: "bg-orange-500", text: "text-orange-500", label: "Very Urgent" },
  3: { bg: "bg-yellow-500", text: "text-yellow-500", label: "Urgent"      },
  4: { bg: "bg-green-500",  text: "text-green-500",  label: "Standard"    },
  5: { bg: "bg-blue-500",   text: "text-blue-500",   label: "Non-Urgent"  },
}

const MTS_COLORS_EL: Record<number, string> = {
  1: "Άμεσο",
  2: "Πολύ Επείγον",
  3: "Επείγον",
  4: "Τυπικό",
  5: "Μη Επείγον",
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="text-3xl font-black text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Shimmer() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
      </div>
      <div className="h-4 skeleton rounded w-1/3 mt-6" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-8 skeleton rounded" />)}
      </div>
      <div className="h-4 skeleton rounded w-1/3 mt-4" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-6 skeleton rounded" />)}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { lang } = useLang();

  const copy = {
    en: {
      title: "Analytics",
      close: "Close",
      totalTriages: "Total Triages",
      uniquePatients: "Unique Patients",
      avgMts: "Avg. MTS Level",
      ragPct: "RAG Assisted",
      mtsDistrib: "MTS Distribution",
      topSpecialties: "Top Specialties",
      langDistrib: "Language Breakdown",
      noData: "No analytics data available yet.",
      errorMsg: "Analytics are unavailable while offline.",
      level: "Level",
      langLabels: { en: "English", el: "Greek" },
    },
    el: {
      title: "Αναλυτικά",
      close: "Κλείσιμο",
      totalTriages: "Σύνολο Αξιολογήσεων",
      uniquePatients: "Μοναδικοί Ασθενείς",
      avgMts: "Μέσος Βαθμός MTS",
      ragPct: "Με Υποστήριξη RAG",
      mtsDistrib: "Κατανομή MTS",
      topSpecialties: "Κορυφαίες Ειδικότητες",
      langDistrib: "Κατανομή Γλώσσας",
      noData: "Δεν υπάρχουν ακόμα αναλυτικά δεδομένα.",
      errorMsg: "Τα αναλυτικά δεν είναι διαθέσιμα εκτός σύνδεσης.",
      level: "Επίπεδο",
      langLabels: { en: "Αγγλικά", el: "Ελληνικά" },
    },
  }[lang];

  useEffect(() => {
    let cancelled = false;
    resolveApiBase()
      .then((base) => fetch(buildApiUrl(base, "/api/v1/analytics")))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<AnalyticsData>;
      })
      .then((val) => { if (!cancelled) { setData(val); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <h2 id="analytics-panel-title" className="text-base font-semibold text-foreground">
              {copy.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={copy.close}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <Shimmer />
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">{copy.errorMsg}</p>
          </div>
        ) : !data || data.total_triages === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">{copy.noData}</p>
          </div>
        ) : (
          <div className="p-6 space-y-8">

            {/* ── KPI cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={copy.totalTriages} value={data.total_triages.toLocaleString()} />
              <StatCard label={copy.uniquePatients} value={data.unique_patients.toLocaleString()} />
              <StatCard
                label={copy.avgMts}
                value={data.avg_mts_level !== null ? data.avg_mts_level.toFixed(1) : "—"}
                sub="1 = most urgent"
              />
              <StatCard
                label={copy.ragPct}
                value={`${data.rag_percentage}%`}
                sub="Knowledge-assisted"
              />
            </div>

            {/* ── MTS Distribution ────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase mb-3">
                {copy.mtsDistrib}
              </p>
              <div className="space-y-2.5">
                {data.mts_distribution.map((item) => {
                  const palette = MTS_COLORS[item.mts_level] ?? MTS_COLORS[5]
                  const pct = Math.max((item.count / data.total_triages) * 100, 0)
                  const label = lang === "el"
                    ? MTS_COLORS_EL[item.mts_level] ?? `${copy.level} ${item.mts_level}`
                    : palette.label
                  return (
                    <div key={item.mts_level}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${palette.bg}`} aria-hidden="true" />
                          <span className="text-sm text-foreground">
                            {copy.level} {item.mts_level}
                            <span className="text-muted-foreground ml-1.5 font-normal text-xs">
                              {label}
                            </span>
                          </span>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${palette.text}`}>
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${palette.bg} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Top Specialties ─────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase mb-3">
                {copy.topSpecialties}
              </p>
              <div className="space-y-1.5">
                {data.specialty_distribution.slice(0, 6).map((item, idx) => {
                  const pct = Math.max((item.count / data.total_triages) * 100, 0)
                  return (
                    <div key={item.specialty} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted-foreground w-4 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm text-foreground truncate pr-2">{item.specialty}</span>
                          <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 tabular-nums">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Language Breakdown ──────────────────────────────── */}
            {data.lang_distribution.length > 0 && (
              <section>
                <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase mb-3">
                  {copy.langDistrib}
                </p>
                <div className="flex gap-3">
                  {data.lang_distribution.map((item) => {
                    const pct = Math.round((item.count / data.total_triages) * 100)
                    const label = copy.langLabels[item.lang as "en" | "el"] ?? item.lang.toUpperCase()
                    return (
                      <div key={item.lang} className="flex-1 rounded-xl border border-border bg-muted/40 p-3 text-center">
                        <p className="text-xl font-black text-foreground">{pct}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        <p className="text-[10px] text-muted-foreground/70">{item.count}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}