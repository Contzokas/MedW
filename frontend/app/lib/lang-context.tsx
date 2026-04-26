"use client"

import { createContext, useContext, useState } from "react"
import { Lang, translations } from "@/app/lib/translations"

interface LangContextType {
  lang: Lang
  t: typeof translations["en"]
  toggleLang: () => void
}

const LangContext = createContext<LangContextType | undefined>(undefined)

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en")

  const toggleLang = () => setLang((prev) => (prev === "en" ? "el" : "en"))

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("useLang must be used within LangProvider")
  return ctx
}
