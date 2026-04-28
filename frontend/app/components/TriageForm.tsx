"use client"

import { useState } from "react"
import { submitTriage } from "@/app/lib/api"
import { FollowUpResponse, TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"

interface TriageFormProps {
  onResult: (result: TriageResponse) => void
  onStartLoading?: () => void
  patientId: string
  latitude: number | null
  longitude: number | null
}

interface FollowUpState {
  question: string
  followUpCount: number
  conversationContext: string
}

export default function TriageForm({ onResult, onStartLoading, patientId, latitude, longitude }: TriageFormProps) {
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<FollowUpState | null>(null)
  const [followUpAnswer, setFollowUpAnswer] = useState("")
  const { t, lang } = useLang()

  const handleReset = () => {
    setFollowUp(null)
    setFollowUpAnswer("")
    setError(null)
    setSymptoms("")
  }

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    onStartLoading?.()
    setError(null)

    try {
      const result = await submitTriage(symptoms, patientId, lang, 0, "", true, latitude, longitude)
      if (result.type === "follow_up") {
        const fu = result as FollowUpResponse
        setFollowUp({ question: fu.question, followUpCount: fu.follow_up_count, conversationContext: "" })
      } else {
        onResult(result as TriageResponse)
        setSymptoms("")
      }
    } catch (err) {
      console.error("[TriageForm] submit error:", err)
      setError(t.form.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !followUp) return
    setIsLoading(true)
    onStartLoading?.()
    setError(null)

    const newContext = followUp.conversationContext
      ? `${followUp.conversationContext}\n\nQ: ${followUp.question}\nA: ${followUpAnswer}`
      : `Q: ${followUp.question}\nA: ${followUpAnswer}`

    try {
      const result = await submitTriage(symptoms, patientId, lang, followUp.followUpCount, newContext, true, latitude, longitude)
      if (result.type === "follow_up") {
        const fu = result as FollowUpResponse
        setFollowUp({ question: fu.question, followUpCount: fu.follow_up_count, conversationContext: newContext })
        setFollowUpAnswer("")
      } else {
        onResult(result as TriageResponse)
        setFollowUp(null)
        setFollowUpAnswer("")
        setSymptoms("")
      }
    } catch (err) {
      console.error("[TriageForm] follow-up error:", err)
      setError(t.form.error)
    } finally {
      setIsLoading(false)
    }
  }

  if (followUp) {
    return (
      <form onSubmit={handleFollowUpSubmit} className="space-y-6">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <p className="mb-1 font-medium text-primary">{t.followUp.questionLabel}</p>
          <p>{followUp.question}</p>
        </div>

        <div>
          <textarea
            rows={3}
            required
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 sm:text-sm bg-card"
            placeholder={t.followUp.answerPlaceholder}
            value={followUpAnswer}
            onChange={(e) => setFollowUpAnswer(e.target.value)}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleReset}
            className="flex-1 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.followUp.back}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t.form.loading : t.followUp.submit}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleInitialSubmit} className="space-y-6">
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
