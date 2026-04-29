"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme")
      if (stored === "light" || stored === "dark") {
        setThemeState(stored)
      }
    } catch {
      console.warn("localStorage unavailable")
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    try {
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark")
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.setAttribute("data-theme", "light")
        document.documentElement.classList.remove("dark")
      }
      localStorage.setItem("theme", theme)
    } catch {
      console.warn("localStorage unavailable, theme not persisted")
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"))
  }

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
