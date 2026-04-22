"use client"

import { useTriageStream } from "@/app/lib/useTriageStream"
import TriageQueueItem from "@/app/dashboard/components/TriageQueueItem"

export default function TriageQueue() {
  const entries = useTriageStream()

  return (
    <div className="bg-card shadow rounded-lg overflow-hidden border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Time (Local)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Patient ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              MTS Level
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Specialty
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                Queue is empty. No new incidents.
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
