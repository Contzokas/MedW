"use client"

import Link from "next/link"

export default function DoctorsLink() {
  return (
    <Link
      href="/doctors"
      aria-label="Browse doctors"
      title="Browse doctors"
      className="theme-toggle-btn w-11 h-11 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all"
    >
      <svg className="w-[18px] h-[18px] text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    </Link>
  )
}
