import { useEffect, useState } from "react"
import { QueueEntry } from "@/app/lib/types"

function isQueueEntry(value: unknown): value is QueueEntry {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const entry = value as Record<string, unknown>
  return (
    typeof entry.patient_id === "string" &&
    typeof entry.mts_level === "number" &&
    typeof entry.specialty === "string" &&
    typeof entry.timestamp === "string"
  )
}

function toQueueEntry(raw: string): QueueEntry | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return isQueueEntry(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * All requests go through /api/proxy/... which is a Next.js API route
 * that reads BACKEND_URL at runtime and proxies to the real backend.
 */
const API_PROXY = "/api/proxy"

export function useTriageStream(): QueueEntry[] {
  const [entries, setEntries] = useState<QueueEntry[]>([])

  useEffect(() => {
    const es = new EventSource(`${API_PROXY}/api/v1/triage/queue`)

    es.addEventListener("triage_update", (event: MessageEvent) => {
      const entry = toQueueEntry(event.data)
      if (!entry) {
        return
      }

      setEntries(prev => {
        const exists = prev.some(
          existing =>
            existing.patient_id === entry.patient_id &&
            existing.timestamp === entry.timestamp &&
            existing.mts_level === entry.mts_level &&
            existing.specialty === entry.specialty,
        )

        if (exists) {
          return prev
        }

        return [entry, ...prev]
      })
    })

    return () => {
      es.close()
    }
  }, [])

  return entries
}
