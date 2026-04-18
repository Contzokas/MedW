"use client"

import { useTriageStream } from "@/app/lib/useTriageStream"
import TriageQueueItem from "@/app/dashboard/components/TriageQueueItem"

export default function TriageQueue() {
  const entries = useTriageStream()

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ώρα (Τοπική)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID Ασθενούς
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Επίπεδο MTS
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ειδικότητα
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
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
