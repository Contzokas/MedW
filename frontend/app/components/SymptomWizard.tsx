"use client"

import { useState } from "react"
import { submitTriage } from "@/app/lib/api"
import { TriageResponse } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"
import {
  BODY_AREAS,
  SEVERITY_OPTIONS,
  DURATION_OPTIONS,
  type BodyArea,
  type SeverityOption,
} from "@/app/lib/wizard-data"
import LoadingOverlay from "./LoadingOverlay"

type WizardStep = "body-area" | "symptoms" | "severity" | "duration" | "review"

const STEPS: WizardStep[] = ["body-area", "symptoms", "severity", "duration", "review"]

const STEP_LABELS: Record<WizardStep, { en: string; el: string }> = {
  "body-area": { en: "Body Area", el: "Περιοχή" },
  "symptoms": { en: "Symptoms", el: "Συμπτώματα" },
  "severity": { en: "Severity", el: "Σοβαρότητα" },
  "duration": { en: "Duration", el: "Διάρκεια" },
  "review": { en: "Review", el: "Έλεγχος" },
}

function generatePatientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID() } catch { /* */ }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

interface WizardState {
  step: WizardStep
  selectedArea: BodyArea | null
  selectedSymptoms: string[]
  severity: string | null
  duration: string | null
  additionalNotes: string
}

function localizedLabel(item: { label_en: string; label_el: string }, lang: "en" | "el"): string {
  return lang === "el" ? item.label_el : item.label_en
}

function localizedDesc(item: SeverityOption, lang: "en" | "el"): string {
  return lang === "el" ? item.description_el : item.description_en
}

interface SymptomWizardProps {
  patientId?: string
  onResult: (result: TriageResponse) => void
  onStartLoading?: () => void
  latitude: number | null
  longitude: number | null
}

const CARD_BASE = "rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200"

const SEVERITY_GRADIENTS: Record<string, string> = {
  mild: "hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-950/20",
  moderate: "hover:border-yellow-400 hover:bg-yellow-50/30 dark:hover:bg-yellow-950/20",
  severe: "hover:border-red-400 hover:bg-red-50/30 dark:hover:bg-red-950/20",
}

export default function SymptomWizard({ patientId, onResult, onStartLoading, latitude, longitude }: SymptomWizardProps) {
  const { t, lang } = useLang()

  const [state, setState] = useState<WizardState>({
    step: "body-area",
    selectedArea: null,
    selectedSymptoms: [],
    severity: null,
    duration: null,
    additionalNotes: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEPS.indexOf(state.step)

  function goBack() {
    const idx = currentStepIndex - 1
    if (idx >= 0) setState((prev) => ({ ...prev, step: STEPS[idx] }))
  }

  function goNext() {
    const idx = currentStepIndex + 1
    if (idx < STEPS.length) setState((prev) => ({ ...prev, step: STEPS[idx] }))
  }

  function toggleSymptom(symptomId: string) {
    setState((prev) => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptomId)
        ? prev.selectedSymptoms.filter((id) => id !== symptomId)
        : [...prev.selectedSymptoms, symptomId],
    }))
  }

  function buildSymptomsString(): string {
    const areaLabel = localizedLabel(state.selectedArea!, lang)
    const symptomLabels = state.selectedSymptoms
      .map((id) => state.selectedArea!.symptoms.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => localizedLabel(s!, lang))
      .join(", ")
    const severityOption = SEVERITY_OPTIONS.find((s) => s.id === state.severity)
    const severityLabel = severityOption ? localizedLabel(severityOption, lang) : ""
    const durationOption = DURATION_OPTIONS.find((d) => d.id === state.duration)
    const durationLabel = durationOption ? localizedLabel(durationOption, lang) : ""

    let text = lang === "el"
      ? `Έχω ${symptomLabels} στην περιοχή ${areaLabel}. Σοβαρότητα: ${severityLabel}. Διάρκεια: ${durationLabel}.`
      : `I have ${symptomLabels} in the ${areaLabel} area. Severity: ${severityLabel}. Duration: ${durationLabel}.`

    if (state.additionalNotes.trim()) text += ` ${state.additionalNotes.trim()}`
    return text
  }

  async function handleSubmit() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    onStartLoading?.()
    try {
      const symptoms = buildSymptomsString()
      const result = await submitTriage(symptoms, patientId ?? generatePatientId(), lang, 0, "", false, latitude, longitude)
      onResult(result as TriageResponse)
    } catch {
      setError(t.form.error)
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = (() => {
    switch (state.step) {
      case "body-area": return state.selectedArea !== null
      case "symptoms": return state.selectedSymptoms.length > 0
      case "severity": return state.severity !== null
      case "duration": return state.duration !== null
      case "review": return true
    }
  })()

  function handleNext() {
    if (state.step === "review") { handleSubmit(); return }
    if (state.step === "symptoms" && state.selectedSymptoms.length === 0) {
      setError(t.wizard.atLeastOne); return
    }
    setError(null)
    goNext()
  }

  function renderStepIndicator() {
    return (
      <div className="mb-8">
        <div className="flex gap-0.5">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            const label = STEP_LABELS[step]
            const stepLabel = lang === "el" ? label.el : label.en
            return (
              <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-2 ${
                  i === 0 ? "rounded-l-full" : i === STEPS.length - 1 ? "rounded-r-full" : ""
                } ${
                  isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                } ${
                  isCurrent ? "ring-2 ring-primary/20" : ""
                } transition-all duration-300`} />
                <span className={`text-[9px] font-semibold text-center leading-tight transition-colors ${
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground/70" : "text-muted-foreground/60"
                }`}>
                  {stepLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderBodyAreaStep() {
    return (
      <div>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">📍</span> {t.wizard.bodyAreaTitle}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BODY_AREAS.map((area) => {
            const selected = state.selectedArea?.id === area.id
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, selectedArea: area, selectedSymptoms: [] }))}
                className={`${CARD_BASE} text-center group ${
                  selected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/60 hover:border-primary/30 hover:shadow-md bg-card"
                }`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200 inline-block">{area.icon}</span>
                <p className="mt-2.5 text-sm font-semibold text-foreground">{localizedLabel(area, lang)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {area.symptoms.length} {lang === "el" ? "συμπτώματα" : "symptoms"}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSymptomsStep() {
    if (!state.selectedArea) return null
    const selectedCount = state.selectedSymptoms.length
    return (
      <div>
        <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
          <span className="text-xl">🔍</span> {t.wizard.symptomTitle}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{localizedLabel(state.selectedArea, lang)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {state.selectedArea.symptoms.map((symptom) => {
            const sel = state.selectedSymptoms.includes(symptom.id)
            return (
              <button
                key={symptom.id}
                type="button"
                onClick={() => toggleSymptom(symptom.id)}
                className={`${CARD_BASE} group ${
                  sel
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border/60 hover:border-primary/30 bg-card"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? "border-primary bg-primary text-white" : "border-border group-hover:border-primary/40"}`}>
                    {sel && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </span>
                  <p className="text-sm font-medium text-foreground">{localizedLabel(symptom, lang)}</p>
                </div>
              </button>
            )
          })}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive font-medium">{error}</p>
        )}
        {selectedCount > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {selectedCount} {lang === "el" ? "επιλεγμένα" : "selected"}
          </p>
        )}
      </div>
    )
  }

  function renderSeverityStep() {
    return (
      <div>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> {t.wizard.severityTitle}
        </h2>
        <div className="space-y-3 max-w-sm mx-auto">
          {SEVERITY_OPTIONS.map((option) => {
            const selected = state.severity === option.id
            const gradient = SEVERITY_GRADIENTS[option.id] ?? ""
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, severity: option.id }))}
                className={`${CARD_BASE} ${gradient} group ${
                  selected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/60 bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-border group-hover:border-primary/40"}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{localizedLabel(option, lang)}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{localizedDesc(option, lang)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderDurationStep() {
    return (
      <div>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">⏱️</span> {t.wizard.durationTitle}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DURATION_OPTIONS.map((option) => {
            const selected = state.duration === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, duration: option.id }))}
                className={`${CARD_BASE} text-center group ${
                  selected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/60 hover:border-primary/30 hover:shadow-md bg-card"
                }`}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-border group-hover:border-primary/40"}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{localizedLabel(option, lang)}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderReviewStep() {
    if (!state.selectedArea) return null
    const selectedSymptomItems = state.selectedSymptoms
      .map((id) => state.selectedArea!.symptoms.find((s) => s.id === id))
      .filter(Boolean)
    const severityOption = SEVERITY_OPTIONS.find((s) => s.id === state.severity)
    const durationOption = DURATION_OPTIONS.find((d) => d.id === state.duration)

    return (
      <div>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">✅</span> {t.wizard.reviewTitle}
        </h2>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">{toCaps(lang === "el" ? "Περιοχή & Συμπτώματα" : "Area & Symptoms", lang)}</p>
            <p className="text-sm font-semibold text-foreground mb-2">{localizedLabel(state.selectedArea, lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedSymptomItems.map((symptom) => (
                <span key={symptom!.id} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {localizedLabel(symptom!, lang)}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-1">📊 {toCaps(t.wizard.severityTitle, lang)}</p>
              <p className="text-sm font-semibold text-foreground">{severityOption ? localizedLabel(severityOption, lang) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-1">⏱️ {toCaps(t.wizard.durationTitle, lang)}</p>
              <p className="text-sm font-semibold text-foreground">{durationOption ? localizedLabel(durationOption, lang) : "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="wizard-notes" className="block text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-2">
            {toCaps(t.wizard.additionalNotes, lang)}
          </label>
          <textarea
            id="wizard-notes"
            rows={3}
            disabled={isLoading}
            className="block w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card resize-none"
            placeholder={lang === "el" ? "Οτιδήποτε άλλο θέλετε να προσθέσετε..." : "Anything else you'd like to add..."}
            value={state.additionalNotes}
            onChange={(e) => setState((prev) => ({ ...prev, additionalNotes: e.target.value }))}
          />
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">{error}</div>
        )}
      </div>
    )
  }

  function renderCurrentStep() {
    switch (state.step) {
      case "body-area": return renderBodyAreaStep()
      case "symptoms": return renderSymptomsStep()
      case "severity": return renderSeverityStep()
      case "duration": return renderDurationStep()
      case "review": return renderReviewStep()
    }
  }

  return (
    <div>
      {renderStepIndicator()}
      <div className="min-h-[200px]">{renderCurrentStep()}</div>

      <div className="flex items-center gap-3 mt-6">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={isLoading}
            className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.wizard.back}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25"
        >
          {isLoading
            ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.form.loading}
              </span>
            )
            : state.step === "review"
              ? t.wizard.submit
              : t.wizard.next}
        </button>
      </div>

      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading} />
    </div>
  )
}
