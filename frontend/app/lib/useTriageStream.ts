import { useEffect, useState, useRef } from "react"
import { QueueEntry } from "@/app/lib/types"
import { buildApiUrl, resolveApiBase } from "@/app/lib/backendResolver"
import toast from "react-hot-toast"

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
  const isFirstLoad = useRef(true)

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

          if (!exists && !isFirstLoad.current) {
            // New entry arrived (not during initial mount hydrate)
            if (entry.mts_level <= 2) {
              const audio = new Audio('/emergency.mp3');
              audio.play().catch(e => console.error("Audio playback failed", e));
              toast.error(`EMERGENCY: ${entry.specialty} Level ${entry.mts_level}\nPatient: ${entry.patient_id}`, {
                duration: 10000,
                style: { background: '#ef4444', color: '#fff' }
              })
              
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Emergency Level ${entry.mts_level}`, {
                  body: `Specialty: ${entry.specialty}\nPatient: ${entry.patient_id}`,
                });
              }
            } else {
              toast.success(`New Patient: ${entry.specialty} - Level ${entry.mts_level}\nPatient: ${entry.patient_id}`)
            }
          }

          if (exists) {
            return prev
          }

          return [entry, ...prev]
        })
      })
      
      // Request notification permissions
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      
      // Mark first load done after a slight delay
      setTimeout(() => {
        isFirstLoad.current = false;
      }, 1000);
    }

    void setup()

    return () => {
      cancelled = true
      es?.close()
    }
  }, [])

  return entries
}
