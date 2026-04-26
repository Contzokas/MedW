"use client"

import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

export default function EmergencyBar() {
  const { t, lang } = useLang()

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center border-t border-destructive/30 bg-destructive/10 backdrop-blur-md px-4 py-2.5">
      <p className="text-xs font-semibold tracking-[0.18em] text-destructive/80">
        {toCaps(t.emergency, lang)}{" "}
        <span className="emergency-number text-sm font-black tracking-[0.2em] text-destructive">166</span>
      </p>
    </div>
  )
}
