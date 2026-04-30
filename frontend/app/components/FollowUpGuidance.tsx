"use client"

import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface FollowUpGuidanceProps {
  mtsLevel: number
}

const GUIDANCE: Record<number, { en: string; el: string }> = {
  1: {
    en: "This is a medical emergency. Call 166 (ambulance) or go to the nearest hospital immediately.",
    el: "Επείγον ιατρικό περιστατικό. Καλέστε το 166 (ασθενοφόρο) ή μεταβείτε αμέσως στο πλησιέστερο νοσοκομείο.",
  },
  2: {
    en: "Your condition requires urgent attention. Please visit the emergency department within 10 minutes.",
    el: "Η κατάστασή σας απαιτεί επείγουσα φροντίδα. Επισκεφθείτε το τμήμα επειγόντων εντός 10 λεπτών.",
  },
  3: {
    en: "Your condition should be evaluated soon. Visit the emergency department or your doctor within 60 minutes.",
    el: "Η κατάστασή σας πρέπει να αξιολογηθεί σύντομα. Επισκεφθείτε το τμήμα επειγόντων ή τον γιατρό σας εντός 60 λεπτών.",
  },
  4: {
    en: "Your condition can wait but should be seen within a few hours. Schedule a visit with the recommended doctor.",
    el: "Η κατάστασή σας μπορεί να περιμένει αλλά πρέπει να εξεταστεί εντός λίγων ωρών. Κλείστε ραντεβού με τον προτεινόμενο γιατρό.",
  },
  5: {
    en: "Your condition is not urgent. You can schedule a routine appointment at your convenience.",
    el: "Η κατάστασή σας δεν είναι επείγουσα. Μπορείτε να κλείσετε ραντεβού ρουτίνας όποτε σας εξυπηρετεί.",
  },
}

export default function FollowUpGuidance({ mtsLevel }: FollowUpGuidanceProps) {
  const { t, lang } = useLang()
  const guidance = GUIDANCE[mtsLevel]

  if (!guidance) return null

  const bgMap: Record<number, string> = {
    1: "border-destructive/30 bg-destructive/5",
    2: "border-orange-500/30 bg-orange-500/5",
    3: "border-amber-500/30 bg-amber-500/5",
    4: "border-primary/20 bg-primary/5",
    5: "border-emerald-500/30 bg-emerald-500/5",
  }

  const iconMap: Record<number, string> = { 1: "🚨", 2: "⚠️", 3: "⚡", 4: "💡", 5: "✅" }

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${bgMap[mtsLevel] ?? "border-border bg-muted/40"}`}>
      <span className="text-lg mt-0.5">{iconMap[mtsLevel] ?? "ℹ️"}</span>
      <div className="text-sm text-foreground">
        <p className="mb-1 font-semibold">{toCaps(t.guidance.title, lang)}</p>
        <p>{lang === "el" ? guidance.el : guidance.en}</p>
      </div>
    </div>
  )
}
