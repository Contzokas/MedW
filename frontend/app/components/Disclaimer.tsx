"use client"

import { useLang } from "@/app/lib/lang-context"

export default function Disclaimer() {
  const { t } = useLang()

  return (
    <div
      role="note"
      aria-label="Important medical notice"
      className="mb-6 rounded-lg border border-warning bg-warning/10 p-4 text-base"
    >
      <p className="font-semibold text-warning">
        ⚠️ Important Notice
      </p>
      <p className="mt-1 text-foreground">
        MEDΩ is an AI system for initial symptom assessment and{" "}
        <strong>does not constitute a clinical diagnosis</strong>. Results are
        indicative and do not replace professional medical advice. In case of
        emergency, call <strong>112</strong>.
      </p>
    </div>
  )
}
