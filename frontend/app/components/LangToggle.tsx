"use client"

import { useLang } from "@/app/lib/lang-context"

export default function LangToggle() {
  const { lang, toggleLang } = useLang()

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={`Switch to ${lang === "en" ? "Greek" : "English"}`}
      className="theme-toggle-btn h-11 px-3 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className={`text-xs font-bold tracking-widest transition-colors ${lang === "en" ? "text-primary" : "text-muted-foreground"}`}>EN</span>
      <span className="text-muted-foreground/40 mx-1 text-xs">|</span>
      <span className={`text-xs font-bold tracking-widest transition-colors ${lang === "el" ? "text-primary" : "text-muted-foreground"}`}>EL</span>
    </button>
  )
}
