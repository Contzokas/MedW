"use client"

import { useState } from "react"
import { TriageHistoryEntry } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface HistoryEntryProps {
  entry: TriageHistoryEntry
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-destructive",
  2: "bg-destructive",
  3: "bg-amber-500",
  4: "bg-emerald-500",
  5: "bg-emerald-500",
}

function formatDate(isoString: string, locale: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString(locale === "el" ? "el-GR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function HistoryEntry({ entry }: HistoryEntryProps) {
  const [expanded, setExpanded] = useState(false)
  const { t, lang } = useLang()
  const colorClass = MTS_COLORS[entry.mts_level] ?? "bg-muted"

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-1 text-left cursor-pointer group"
        aria-expanded={expanded}
      >
        {/* MTS badge */}
        <span
          className={`w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-sm font-black text-white ${colorClass}`}
          aria-label={`Triage level ${entry.mts_level}`}
        >
          {entry.mts_level}
        </span>

        {/* Date + specialty */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {formatDate(entry.created_at, lang)}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {entry.specialty}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="pb-4 pl-12 pr-1 space-y-3">
          {/* Symptoms */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              {toCaps(t.history.symptoms, lang)}
            </p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">
              {entry.symptoms}
            </p>
          </div>

          {/* Reasoning */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              {toCaps(t.history.reasoning, lang)}
            </p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">
              {entry.reasoning}
            </p>
          </div>

          {/* Doctor */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              {toCaps(t.history.doctor, lang)}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {entry.doctor_name}
              {entry.doctor_specialty && (
                <span className="text-muted-foreground">
                  {" "}
                  &mdash; {entry.doctor_specialty}
                </span>
              )}
            </p>
          </div>

          {/* Redirect link */}
          {entry.redirect_url && (
            <a
              href={entry.redirect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              {t.doctor.link}
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
