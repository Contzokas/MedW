"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as Theme | null
      if (stored) {
        setTheme(stored)
      } else {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setTheme(systemPrefersDark ? "dark" : "light")
      }
    } catch (error) {
      // localStorage unavailable (private browsing, iframe restrictions, etc.)
      console.warn("localStorage unavailable, using system preference")
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemPrefersDark ? "dark" : "light")
    }
    setMounted(true)
  }, [])

  // Apply theme to document and localStorage
  useEffect(() => {
    if (mounted) {
      try {
        if (theme === "light" || theme === "dark") {
          document.documentElement.setAttribute("data-theme", theme)
        } else {
          // Remove data-theme attribute for system preference mode
          document.documentElement.removeAttribute("data-theme")
        }
        localStorage.setItem("theme", theme)
      } catch (error) {
        // localStorage unavailable (private browsing, iframe restrictions, etc.)
        console.warn("localStorage unavailable, theme not persisted")
      }
    }
  }, [theme, mounted])

  // Listen for system preference changes (only when no manual selection)
  useEffect(() => {
    if (mounted && !localStorage.getItem("theme")) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? "dark" : "light")
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [mounted])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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