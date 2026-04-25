"use client"

import { useLang } from "@/app/lib/lang-context"

export default function EmergencyBar() {
  const { t } = useLang()

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center border-t border-destructive/30 bg-destructive/10 backdrop-blur-md px-4 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive/80">
        {t.emergency}{" "}
        <span className="emergency-number text-sm font-black tracking-[0.2em] text-destructive">166</span>
      </p>
    </div>
  )
}
