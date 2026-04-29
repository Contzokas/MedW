"use client"

import { useState, useCallback } from "react"
import { UserProfile } from "@/app/lib/types"
import { useProfile } from "@/app/lib/profile-context"
import { useLang } from "@/app/lib/lang-context"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sex = "M" | "F" | "other" | null
type BoolNull = boolean | null

interface DraftProfile {
  age: string
  sex: Sex
  chronic_conditions: string
  medications: string
  allergies: string
  smoking: BoolNull
  alcohol: BoolNull
  pregnant: BoolNull
}

const EMPTY_DRAFT: DraftProfile = {
  age: "",
  sex: null,
  chronic_conditions: "",
  medications: "",
  allergies: "",
  smoking: null,
  alcohol: null,
  pregnant: null,
}

function draftToProfile(d: DraftProfile): UserProfile {
  return {
    age: d.age.trim() !== "" ? parseInt(d.age, 10) : null,
    sex: d.sex,
    chronic_conditions: d.chronic_conditions.trim(),
    medications: d.medications.trim(),
    allergies: d.allergies.trim(),
    smoking: d.smoking === true,
    alcohol: d.alcohol === true,
    pregnant: d.pregnant,
  }
}

function profileToDraft(p: UserProfile): DraftProfile {
  return {
    age: p.age !== null ? String(p.age) : "",
    sex: p.sex,
    chronic_conditions: p.chronic_conditions,
    medications: p.medications,
    allergies: p.allergies,
    smoking: p.smoking,
    alcohol: p.alcohol,
    pregnant: p.pregnant,
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
              i < current
                ? "bg-primary text-white scale-95"
                : i === current
                ? "bg-primary text-white ring-2 ring-primary/40 ring-offset-2 ring-offset-card"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < current ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded transition-all duration-500 ${i < current ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function TripleToggle({
  value,
  onChange,
  labelYes,
  labelNo,
  labelNA,
}: {
  value: BoolNull
  onChange: (v: BoolNull) => void
  labelYes: string
  labelNo: string
  labelNA?: string
}) {
  const opts: Array<{ label: string; val: BoolNull }> = [
    { label: labelYes, val: true },
    { label: labelNo, val: false },
    ...(labelNA ? [{ label: labelNA, val: null as BoolNull }] : []),
  ]
  return (
    <div className="flex gap-2 flex-wrap">
      {opts.map(({ label, val }) => (
        <button
          key={String(val)}
          type="button"
          onClick={() => onChange(val)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
            value === val
              ? "bg-primary border-primary text-white shadow-sm"
              : "bg-card border-border text-foreground hover:border-primary/60 hover:bg-primary/5"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SexPicker({ value, onChange, labels }: { value: Sex; onChange: (v: Sex) => void; labels: { m: string; f: string; other: string; ns: string } }) {
  const opts: Array<{ label: string; val: Sex }> = [
    { label: labels.m, val: "M" },
    { label: labels.f, val: "F" },
    { label: labels.other, val: "other" },
    { label: labels.ns, val: null },
  ]
  return (
    <div className="flex gap-2 flex-wrap">
      {opts.map(({ label, val }) => (
        <button
          key={String(val)}
          type="button"
          onClick={() => onChange(val)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
            value === val
              ? "bg-primary border-primary text-white shadow-sm"
              : "bg-card border-border text-foreground hover:border-primary/60 hover:bg-primary/5"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-foreground mb-2">{children}</p>
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ProfilerModalProps {
  onClose: () => void
  isEditing?: boolean
}

const TOTAL_STEPS = 3

export default function ProfilerModal({ onClose, isEditing = false }: ProfilerModalProps) {
  const { profile, setProfile } = useProfile()
  const { t } = useLang()
  const tp = t.profiler

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DraftProfile>(() =>
    profile ? profileToDraft(profile) : EMPTY_DRAFT
  )
  const [closing, setClosing] = useState(false)

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 250)
  }, [onClose])

  const handleSave = () => {
    setProfile(draftToProfile(draft))
    close()
  }

  const handleSkip = () => {
    close()
  }

  const update = <K extends keyof DraftProfile>(key: K, value: DraftProfile[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const showPregnant = draft.sex === "F" || draft.sex === null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-250 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className={`relative w-full max-w-md bg-card border border-primary/20 rounded-2xl shadow-2xl flex flex-col transition-all duration-250 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{ maxHeight: "90dvh" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEditing ? tp.editTitle : tp.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{tp.subtitle}</p>
            </div>
            <button
              onClick={handleSkip}
              className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4">
            <StepIndicator
              current={step}
              total={TOTAL_STEPS}
              labels={[tp.steps.s1, tp.steps.s2, tp.steps.s3]}
            />
            <p className="text-center text-xs text-muted-foreground -mt-2 mb-1">
              {tp.step} {step + 1} {tp.of} {TOTAL_STEPS} — <span className="font-medium text-foreground">{[tp.steps.s1, tp.steps.s2, tp.steps.s3][step]}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Step 1: Personal Info ── */}
          {step === 0 && (
            <>
              <div>
                <FieldLabel>{tp.fields.age}</FieldLabel>
                <input
                  id="profiler-age"
                  type="number"
                  min={0}
                  max={120}
                  placeholder={tp.fields.agePlaceholder}
                  value={draft.age}
                  onChange={(e) => update("age", e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <FieldLabel>{tp.fields.sex}</FieldLabel>
                <SexPicker
                  value={draft.sex}
                  onChange={(v) => update("sex", v)}
                  labels={{ m: tp.fields.sexM, f: tp.fields.sexF, other: tp.fields.sexOther, ns: tp.fields.sexNotSpecified }}
                />
              </div>
            </>
          )}

          {/* ── Step 2: Medical History ── */}
          {step === 1 && (
            <>
              <div>
                <FieldLabel>{tp.fields.chronic}</FieldLabel>
                <textarea
                  id="profiler-chronic"
                  rows={2}
                  placeholder={tp.fields.chronicPlaceholder}
                  value={draft.chronic_conditions}
                  onChange={(e) => update("chronic_conditions", e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <FieldLabel>{tp.fields.medications}</FieldLabel>
                <textarea
                  id="profiler-medications"
                  rows={2}
                  placeholder={tp.fields.medicationsPlaceholder}
                  value={draft.medications}
                  onChange={(e) => update("medications", e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <FieldLabel>{tp.fields.allergies}</FieldLabel>
                <textarea
                  id="profiler-allergies"
                  rows={2}
                  placeholder={tp.fields.allergiesPlaceholder}
                  value={draft.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </>
          )}

          {/* ── Step 3: Lifestyle ── */}
          {step === 2 && (
            <>
              <div>
                <FieldLabel>{tp.fields.smoking}</FieldLabel>
                <TripleToggle
                  value={draft.smoking}
                  onChange={(v) => update("smoking", v)}
                  labelYes={tp.fields.yes}
                  labelNo={tp.fields.no}
                />
              </div>
              <div>
                <FieldLabel>{tp.fields.alcohol}</FieldLabel>
                <TripleToggle
                  value={draft.alcohol}
                  onChange={(v) => update("alcohol", v)}
                  labelYes={tp.fields.yes}
                  labelNo={tp.fields.no}
                />
              </div>
              {showPregnant && (
                <div>
                  <FieldLabel>{tp.fields.pregnant}</FieldLabel>
                  <TripleToggle
                    value={draft.pregnant}
                    onChange={(v) => update("pregnant", v)}
                    labelYes={tp.fields.yes}
                    labelNo={tp.fields.no}
                    labelNA={tp.fields.notApplicable}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Privacy notice */}
        <div className="px-6 pb-1">
          <p className="text-[11px] text-muted-foreground/70 text-center">{tp.privacy}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-5 border-t border-border flex items-center justify-between gap-3">
          {step === 0 ? (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tp.skip}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {tp.back}
            </button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              {tp.next}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {tp.save}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
