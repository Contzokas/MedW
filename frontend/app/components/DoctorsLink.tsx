"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function DoctorsLink() {
  const pathname = usePathname()
  if (pathname === "/management") return null

  return (
    <Link
      href="/doctors"
      className="theme-toggle-btn h-11 px-3 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors hover:bg-card/80"
      aria-label="Doctors Dashboard"
    >
      <svg className="w-4 h-4 text-foreground/70 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
      <span className="text-xs font-bold tracking-widest text-muted-foreground">DOCTORS</span>
    </Link>
  )
}
