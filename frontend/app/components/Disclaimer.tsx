"use client"

import { useLang } from "@/app/lib/lang-context"

export default function Disclaimer() {
  const { t } = useLang()

  return (
    <div
      role="note"
      aria-label={t.disclaimer.ariaLabel}
      className="rounded-lg border border-warning bg-warning/10 p-4 text-sm"
    >
      <p className="font-semibold text-warning">{t.disclaimer.title}</p>
      <p className="mt-1 text-foreground">
        {t.disclaimer.body}
        <strong>{t.disclaimer.bodyStrong}</strong>
        {t.disclaimer.body2}
        <strong>{t.disclaimer.bodyStrong2}</strong>
        {t.disclaimer.body3}
      </p>
    </div>
  )
}
