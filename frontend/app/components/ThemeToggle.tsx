"use client"

import { useTheme } from "@/app/lib/theme-context"

export default function ThemeToggle() {
  try {
    const { theme, toggleTheme } = useTheme()

    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        className="theme-toggle-btn w-11 h-11 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {theme === "light" ? (
          <svg className="w-[18px] h-[18px] text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px] text-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>
    )
  } catch {
    return null
  }
}
