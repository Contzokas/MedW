import { useEffect, useState } from "react"
import { QueueEntry } from "@/app/lib/types"
import { buildApiUrl, resolveApiBase } from "@/app/lib/backendResolver"

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

export function useTriageStream(): QueueEntry[] {
  const [entries, setEntries] = useState<QueueEntry[]>([])

  useEffect(() => {
    let es: EventSource | null = null
    let cancelled = false

    const setup = async () => {
      const apiBase = await resolveApiBase()

      if (cancelled) {
        return
      }

      es = new EventSource(buildApiUrl(apiBase, "/api/v1/triage/queue"))

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
    }

    void setup()

    return () => {
      cancelled = true
      es?.close()
    }
  }, [])

  return entries
}
