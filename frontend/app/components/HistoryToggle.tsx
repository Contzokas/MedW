"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

export default function HistoryToggle() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const active = searchParams.get("history") === "1"

  const toggle = useCallback(() => {
    if (pathname !== "/") {
      router.push(active ? "/" : "/?history=1")
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    if (active) {
      params.delete("history")
    } else {
      params.set("history", "1")
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : "/")
  }, [active, router, pathname, searchParams])

  return (
      <button
        id="tab-history"
        type="button"
        onClick={toggle}
      aria-label={active ? "Back to assessment" : "View history"}
      title={active ? "Back to assessment" : "View history"}
      className={`theme-toggle-btn w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
        active
          ? "border-primary/30 bg-primary/10"
          : "border-border/50 bg-card/60 backdrop-blur-md shadow-lg"
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
    >
      <svg className={`w-[18px] h-[18px] transition-colors ${active ? "text-primary" : "text-foreground/70"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    </button>
  )
}
