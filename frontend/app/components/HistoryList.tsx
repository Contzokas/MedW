"use client"

import { useState, useEffect, useCallback } from "react"
import { TriageHistoryEntry } from "@/app/lib/types"
import { getTriageHistory } from "@/app/lib/api"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"
import HistoryEntry from "./HistoryEntry"

interface HistoryListProps {
  patientId: string
}

const PAGE_SIZE = 10

export default function HistoryList({ patientId }: HistoryListProps) {
  const [entries, setEntries] = useState<TriageHistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const { t, lang } = useLang()

  const fetchInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTriageHistory(patientId, PAGE_SIZE, 0)
      setEntries(data.entries)
      setTotal(data.total)
    } catch {
      setError(t.form.error)
    } finally {
      setLoading(false)
    }
  }, [patientId, t.form.error])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const data = await getTriageHistory(patientId, PAGE_SIZE, entries.length)
      setEntries((prev) => [...prev, ...data.entries])
      setTotal(data.total)
    } catch {
      setError(t.form.error)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{t.history.empty}</p>
      </div>
    )
  }

  const hasMore = entries.length < total

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-3">
        {toCaps(t.history.title, lang)}
      </p>

      <div>
        {entries.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : null}
            {t.history.loadMore}
          </button>
        </div>
      )}
    </div>
  )
}
