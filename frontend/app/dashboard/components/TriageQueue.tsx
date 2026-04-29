"use client"

import { useTriageStream } from "@/app/lib/useTriageStream"
import TriageQueueItem from "@/app/dashboard/components/TriageQueueItem"
import { toCaps } from "@/app/lib/casing"

export default function TriageQueue() {
  const entries = useTriageStream()
  const h = (text: string) => toCaps(text, "el")

  return (
    <div className="bg-card shadow rounded-lg overflow-hidden border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
              {h("Ώρα (Τοπική)")}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
              {h("ID Ασθενούς")}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
              {h("Επίπεδο MTS")}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
              {h("Ειδικότητα")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                Η ουρά είναι άδεια. Δεν υπάρχουν νέα περιστατικά.
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <TriageQueueItem
                key={`${entry.patient_id}-${entry.timestamp}-${entry.mts_level}-${entry.specialty}`}
                entry={entry}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
