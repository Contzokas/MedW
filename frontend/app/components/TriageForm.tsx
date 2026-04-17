"use client"

import { useState } from "react"
import { submitTriage } from "@/app/lib/api"
import { TriageResponse } from "@/app/lib/types"

interface TriageFormProps {
  onResult: (result: TriageResponse) => void
}

export default function TriageForm({ onResult }: TriageFormProps) {
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) {
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const patientId = crypto.randomUUID()
      const result = await submitTriage(symptoms, patientId)
      onResult(result)
      setSymptoms("")
    } catch {
      setError("Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
          Συμπτώματα
        </label>
        <textarea
          id="symptoms"
          name="symptoms"
          rows={4}
          required
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
          placeholder="Περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία αναπνοής)..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Ανάλυση σε εξέλιξη..." : "Εκτίμηση Συμπτωμάτων"}
      </button>
    </form>
  )
}
