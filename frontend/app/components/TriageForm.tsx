"use client"

import { useState, useEffect } from "react"
import { submitTriage } from "@/app/lib/api"
import { FollowUpResponse, TriageResponse, RedirectToWizardResponse, UncertainResultResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { useProfile } from "@/app/lib/profile-context"
import { QUICK_SYMPTOMS } from "@/app/lib/wizard-data"
import LoadingOverlay from "./LoadingOverlay"

interface TriageFormProps {
  onResult: (result: TriageResponse) => void
  onStartLoading?: () => void
  onLoadingDone?: () => void
  onSwitchToWizard?: () => void
  onRedirectActive?: (active: boolean) => void
  patientId: string
  latitude: number | null
  longitude: number | null
  geoDenied: boolean
  geoLoading: boolean
  geoDismissed: boolean
  onRequestLocation: () => void
}

interface FollowUpState {
  question: string
  followUpCount: number
  conversationContext: string
}

const PROMPTS = [
  { en: "How are you feeling today? Describe your symptoms.", el: "Πώς αισθάνεστε σήμερα; Περιγράψτε τα συμπτώματά σας." },
  { en: "What brought you here? Tell us what's bothering you.", el: "Τι σας έφερε εδώ; Πείτε μας τι σας απασχολεί." },
  { en: "Where does it hurt? Be as specific as you can.", el: "Πού πονάτε; Περιγράψτε όσο πιο συγκεκριμένα μπορείτε." },
  { en: "When did your symptoms start? Describe how you feel.", el: "Πότε ξεκίνησαν τα συμπτώματα; Περιγράψτε πώς αισθάνεστε." },
  { en: "Tell us your symptoms — we're here to help.", el: "Πείτε μας τα συμπτώματά σας — είμαστε εδώ για να βοηθήσουμε." },
  { en: "Describe what you're experiencing right now.", el: "Περιγράψτε τι βιώνετε αυτή τη στιγμή." },
  { en: "What's on your mind? Share your health concerns.", el: "Τι σας απασχολεί; Μοιραστείτε τις ανησυχίες σας για την υγεία σας." },
]

export default function TriageForm({
  onResult,
  onStartLoading,
  onLoadingDone,
  onSwitchToWizard,
  onRedirectActive,
  patientId,
  latitude,
  longitude,
  geoDenied,
  geoLoading,
  geoDismissed,
  onRequestLocation,
}: TriageFormProps) {
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<FollowUpState | null>(null)
  const [followUpAnswer, setFollowUpAnswer] = useState("")
  const [redirectToWizard, setRedirectToWizard] = useState<string | null>(null)
  const [uncertainResult, setUncertainResult] = useState<string | null>(null)
  const [userDismissed, setUserDismissed] = useState(false)
  const [chipsVisible, setChipsVisible] = useState(true)
  const [promptIdx, setPromptIdx] = useState(0)
  const { t, lang } = useLang()
  const { profile } = useProfile()

  // Random daily prompt — safe one-time init after mount
  useEffect(() => {
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length))
  }, [])

  const prompt = PROMPTS[promptIdx]

  const handleReset = () => {
    setFollowUp(null)
    setFollowUpAnswer("")
    setRedirectToWizard(null)
    setUncertainResult(null)
    onRedirectActive?.(false)
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
      const result = await submitTriage(symptoms, patientId, lang, 0, "", true, latitude, longitude, profile)
      if (result.type === "follow_up") {
        const fu = result as FollowUpResponse
        setFollowUp({ question: fu.question, followUpCount: fu.follow_up_count, conversationContext: "" })
      } else if (result.type === "redirect_to_wizard") {
        setRedirectToWizard((result as RedirectToWizardResponse).guidance_message)
        onRedirectActive?.(true)
      } else if (result.type === "uncertain_result") {
        setUncertainResult((result as UncertainResultResponse).message)
      } else {
        onResult(result as TriageResponse)
        setSymptoms("")
      }
    } catch {
      setError(t.form.error)
    } finally {
      setIsLoading(false)
      onLoadingDone?.()
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
      } else if (result.type === "redirect_to_wizard") {
        setFollowUp(null)
        setFollowUpAnswer("")
        setRedirectToWizard((result as RedirectToWizardResponse).guidance_message)
        onRedirectActive?.(true)
      } else if (result.type === "uncertain_result") {
        setFollowUp(null)
        setFollowUpAnswer("")
        setUncertainResult((result as UncertainResultResponse).message)
      } else {
        onResult(result as TriageResponse)
        setFollowUp(null)
        setFollowUpAnswer("")
        setSymptoms("")
      }
    } catch {
      setError(t.form.error)
    } finally {
      setIsLoading(false)
      onLoadingDone?.()
    }
  }

  const addSymptomChip = (fill: string) => {
    setChipsVisible(false)
    setSymptoms((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return fill
      if (trimmed.endsWith(".") || trimmed.endsWith(",")) return `${prev} ${fill}`
      return `${prev}, ${fill}`
    })
  }

  const showLocationHint = !followUp && !uncertainResult && symptoms.trim().length > 0 && latitude === null && !userDismissed && !geoDismissed

  if (uncertainResult) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <span className="text-lg mt-0.5">⚠️</span>
          <div className="text-sm text-foreground flex-1">
            <p className="mb-2 font-semibold text-destructive">{t.uncertainResult.title}</p>
            <p>{t.uncertainResult.message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleReset}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.uncertainResult.startOver}
          </button>
        </div>
      </div>
    )
  }

  if (followUp) {
    return (
      <form onSubmit={handleFollowUpSubmit} className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <span className="text-lg mt-0.5">🤖</span>
          <div className="text-sm text-foreground">
            <p className="mb-1 font-semibold text-primary">{t.followUp.questionLabel}</p>
            <p>{followUp.question}</p>
          </div>
        </div>

        <textarea
          rows={3}
          required
          disabled={isLoading}
          className="block w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card resize-none"
          placeholder={t.followUp.answerPlaceholder}
          value={followUpAnswer}
          onChange={(e) => setFollowUpAnswer(e.target.value)}
        />

        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleReset}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.followUp.back}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t.form.loading : t.followUp.submit}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleInitialSubmit} className="space-y-5">
      {/* Redirect to wizard banner — inline, above the form */}
      {redirectToWizard && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">💡</span>
            <div className="text-sm text-foreground flex-1">
              <p className="font-semibold text-amber-600 dark:text-amber-400">{t.redirectToWizard.title}</p>
              <p className="mt-0.5">{redirectToWizard}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => { onSwitchToWizard?.(); onRedirectActive?.(false) }}
            className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.redirectToWizard.tryWizard} ↓
          </button>
        </div>
      )}

      {/* Daily prompt */}
      <p className="text-center text-sm font-medium italic text-primary/80 tracking-wide">
        {lang === "el" ? prompt.el : prompt.en}
      </p>

      {/* Quick symptom chips */}
      <div
        className={`grid transition-[grid-template-rows] duration-400 ease-out ${
          chipsVisible ? "[grid-template-rows:1fr] opacity-100" : "[grid-template-rows:0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap justify-center gap-1.5">
        {QUICK_SYMPTOMS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => addSymptomChip(lang === "el" ? chip.label_el : chip.fill)}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <span className="text-xs">{chip.icon}</span>
            <span>{lang === "el" ? chip.label_el : chip.label_en}</span>
          </button>
        ))}
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          id="symptoms"
          name="symptoms"
          rows={4}
          required
          disabled={isLoading}
          className="block w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card resize-none"
          placeholder={t.form.placeholder}
          value={symptoms}
          onChange={(e) => {
            setSymptoms(e.target.value)
            setChipsVisible(e.target.value.trim().length === 0)
          }}
        />
        <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 tabular-nums pointer-events-none select-none">
          {symptoms.length > 0 && `${symptoms.length}`}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Location hint */}
      {showLocationHint && !geoDenied && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-[11px] text-muted-foreground flex-1 min-w-0">{t.doctor.locationBanner}</span>
          <button type="button" onClick={onRequestLocation} disabled={geoLoading} className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary-hover transition-colors">
            {geoLoading ? "..." : t.doctor.enableLocation}
          </button>
          <button type="button" onClick={() => setUserDismissed(true)} className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {t.doctor.skipLocation}
          </button>
        </div>
      )}

      {showLocationHint && geoDenied && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <span className="text-[11px] text-muted-foreground flex-1 min-w-0">{t.doctor.locationDenied}</span>
          <button type="button" onClick={onRequestLocation} className="shrink-0 text-[11px] text-primary hover:text-primary-hover transition-colors font-semibold">Try again</button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-all disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t.form.loading}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              {t.form.submit}
            </>
          )}
        </span>
        {!isLoading && (
          <span className="absolute inset-0 bg-white/10 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-xl" />
        )}
      </button>

      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading} />
    </form>
  )
}

