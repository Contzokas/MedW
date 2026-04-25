"use client"

import { useState } from "react"
import { submitTriage } from "@/app/lib/api"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

interface TriageFormProps {
  onResult: (result: TriageResponse) => void
}

export default function TriageForm({ onResult }: TriageFormProps) {
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLang()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const patientId = crypto.randomUUID()
      const result = await submitTriage(symptoms, patientId)
      onResult(result)
      setSymptoms("")
    } catch {
      setError(t.form.error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium text-foreground">
          {t.form.label}
        </label>
        <textarea
          id="symptoms"
          name="symptoms"
          rows={4}
          required
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 sm:text-sm bg-card"
          placeholder={t.form.placeholder}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? t.form.loading : t.form.submit}
      </button>
    </form>
  )
}
