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
  type DurationOption,
} from "@/app/lib/wizard-data"

type WizardStep = "body-area" | "symptoms" | "severity" | "duration" | "review"

const STEPS: WizardStep[] = ["body-area", "symptoms", "severity", "duration", "review"]

function generatePatientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID()
    } catch {
      /* insecure context */
    }
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
}

export default function SymptomWizard({ patientId, onResult, onStartLoading }: SymptomWizardProps) {
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
    if (idx >= 0) {
      setState((prev) => ({ ...prev, step: STEPS[idx] }))
    }
  }

  function goNext() {
    const idx = currentStepIndex + 1
    if (idx < STEPS.length) {
      setState((prev) => ({ ...prev, step: STEPS[idx] }))
    }
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

    let text: string
    if (lang === "el") {
      text = `Έχω ${symptomLabels} στην περιοχή ${areaLabel}. Σοβαρότητα: ${severityLabel}. Διάρκεια: ${durationLabel}.`
    } else {
      text = `I have ${symptomLabels} in the ${areaLabel} area. Severity: ${severityLabel}. Duration: ${durationLabel}.`
    }

    if (state.additionalNotes.trim()) {
      text += ` ${state.additionalNotes.trim()}`
    }

    return text
  }

  async function handleSubmit() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    onStartLoading?.()

    try {
      const symptoms = buildSymptomsString()
      const result = await submitTriage(symptoms, patientId ?? generatePatientId(), lang)
      onResult(result)
    } catch (err) {
      console.error("[SymptomWizard] submit error:", err)
      setError(t.form.error)
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = (() => {
    switch (state.step) {
      case "body-area":
        return state.selectedArea !== null
      case "symptoms":
        return state.selectedSymptoms.length > 0
      case "severity":
        return state.severity !== null
      case "duration":
        return state.duration !== null
      case "review":
        return true
    }
  })()

  function handleNext() {
    if (state.step === "review") {
      handleSubmit()
      return
    }

    if (state.step === "symptoms" && state.selectedSymptoms.length === 0) {
      setError(t.wizard.atLeastOne)
      return
    }

    setError(null)
    goNext()
  }

  // ── Step indicator ──
  function renderStepIndicator() {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            {toCaps(t.wizard.step, lang)} {currentStepIndex + 1} {t.wizard.of} {STEPS.length}
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  // ── Step 1: Body area ──
  function renderBodyAreaStep() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t.wizard.bodyAreaTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {BODY_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  selectedArea: area,
                  selectedSymptoms: [],
                }))
              }
              className={`rounded-xl border-2 p-4 cursor-pointer text-left transition-all duration-150 ${
                state.selectedArea?.id === area.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {area.icon}
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">
                {localizedLabel(area, lang)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {area.symptoms.length}{" "}
                {lang === "el" ? "συμπτώματα" : "symptoms"}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 2: Symptoms ──
  function renderSymptomsStep() {
    if (!state.selectedArea) return null

    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t.wizard.symptomTitle}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {localizedLabel(state.selectedArea, lang)}
        </p>
        <div className="space-y-2">
          {state.selectedArea.symptoms.map((symptom) => (
            <button
              key={symptom.id}
              type="button"
              onClick={() => toggleSymptom(symptom.id)}
              className={`w-full rounded-xl border-2 p-4 cursor-pointer text-left transition-all duration-150 ${
                state.selectedSymptoms.includes(symptom.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <p className="text-sm font-medium text-foreground">
                {localizedLabel(symptom, lang)}
              </p>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  // ── Step 3: Severity ──
  function renderSeverityStep() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t.wizard.severityTitle}
        </h2>
        <div className="space-y-3">
          {SEVERITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, severity: option.id }))}
              className={`w-full rounded-xl border-2 p-4 cursor-pointer text-left transition-all duration-150 ${
                state.severity === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                {localizedLabel(option, lang)}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {localizedDesc(option, lang)}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 4: Duration ──
  function renderDurationStep() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t.wizard.durationTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, duration: option.id }))}
              className={`rounded-xl border-2 p-4 cursor-pointer text-left transition-all duration-150 ${
                state.duration === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <p className="text-sm font-medium text-foreground">
                {localizedLabel(option, lang)}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 5: Review ──
  function renderReviewStep() {
    if (!state.selectedArea) return null

    const selectedSymptomItems = state.selectedSymptoms
      .map((id) => state.selectedArea!.symptoms.find((s) => s.id === id))
      .filter(Boolean)

    const severityOption = SEVERITY_OPTIONS.find((s) => s.id === state.severity)
    const durationOption = DURATION_OPTIONS.find((d) => d.id === state.duration)

    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t.wizard.reviewTitle}
        </h2>

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-1">
              {toCaps(state.selectedArea.label_en, lang)}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedSymptomItems.map((symptom) => (
                <span
                  key={symptom!.id}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {localizedLabel(symptom!, lang)}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
                {toCaps(t.wizard.severityTitle, lang)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {severityOption ? localizedLabel(severityOption, lang) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
                {toCaps(t.wizard.durationTitle, lang)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {durationOption ? localizedLabel(durationOption, lang) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Additional notes */}
        <div>
          <label
            htmlFor="wizard-notes"
            className="block text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-2"
          >
            {toCaps(t.wizard.additionalNotes, lang)}
          </label>
          <textarea
            id="wizard-notes"
            rows={3}
            disabled={isLoading}
            className="block w-full rounded-md border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 bg-card"
            placeholder={
              lang === "el"
                ? "Οτιδήποτε άλλο θέλετε να προσθέσετε..."
                : "Anything else you'd like to add..."
            }
            value={state.additionalNotes}
            onChange={(e) => setState((prev) => ({ ...prev, additionalNotes: e.target.value }))}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20"
          >
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Render current step ──
  function renderCurrentStep() {
    switch (state.step) {
      case "body-area":
        return renderBodyAreaStep()
      case "symptoms":
        return renderSymptomsStep()
      case "severity":
        return renderSeverityStep()
      case "duration":
        return renderDurationStep()
      case "review":
        return renderReviewStep()
    }
  }

  return (
    <div>
      {renderStepIndicator()}
      <div className="space-y-6">{renderCurrentStep()}</div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mt-6">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={isLoading}
            className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {t.wizard.back}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isLoading
            ? t.form.loading
            : state.step === "review"
              ? t.wizard.submit
              : t.wizard.next}
        </button>
      </div>
    </div>
  )
}
