"use client"

import { useLang } from "@/app/lib/lang-context"

export default function Disclaimer() {
  const { t } = useLang()

  return (
    <div
      aria-label={t.disclaimer.ariaLabel}
      className="border-t border-warning/30 bg-warning/10 backdrop-blur-md px-4 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2 justify-center text-center sm:text-left"
    >
      <p className="font-bold uppercase tracking-[0.12em] text-warning/90 shrink-0">{t.disclaimer.title}</p>
      <p className="text-foreground/80">
        {t.disclaimer.body}
        <strong>{t.disclaimer.bodyStrong}</strong>
        {t.disclaimer.body2}
        <strong>{t.disclaimer.bodyStrong2}</strong>
        {t.disclaimer.body3}
      </p>
    </div>
  )
}
