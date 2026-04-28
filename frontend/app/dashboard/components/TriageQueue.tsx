"use client"

import { useTriageStream } from "@/app/lib/useTriageStream"
import TriageQueueItem from "@/app/dashboard/components/TriageQueueItem"
import QueueFilters, { FilterState } from "@/app/dashboard/components/QueueFilters"
import PatientDetailDrawer from "@/app/dashboard/components/PatientDetailDrawer"
import ExportButton from "@/app/dashboard/components/ExportButton"
import { toCaps } from "@/app/lib/casing"
import { useState, useMemo } from "react"

export default function TriageQueue() {
  const entries = useTriageStream()
  const h = (text: string) => toCaps(text, "el")
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    mtsLevel: "all",
    specialty: "all",
  })

  const availableSpecialties = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.specialty))).sort();
  }, [entries])

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filters.search && !entry.patient_id.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.mtsLevel !== "all" && entry.mts_level !== parseInt(filters.mtsLevel)) return false
      if (filters.specialty !== "all" && entry.specialty !== filters.specialty) return false
      return true
    })
  }, [entries, filters])

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <QueueFilters 
          onFilterChange={setFilters} 
          availableSpecialties={availableSpecialties} 
        />
        <ExportButton entries={filteredEntries} />
      </div>

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
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                  {entries.length === 0 ? "Η ουρά είναι άδεια. Δεν υπάρχουν νέα περιστατικά." : "Κανένα περιστατικό δεν ταιριάζει στα κριτήρια."}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <TriageQueueItem
                  key={`${entry.patient_id}-${entry.timestamp}-${entry.mts_level}-${entry.specialty}`}
                  entry={entry}
                  onRowClick={(id) => setSelectedPatientId(id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <PatientDetailDrawer 
        patientId={selectedPatientId} 
        onClose={() => setSelectedPatientId(null)} 
      />
    </>
  )
}
