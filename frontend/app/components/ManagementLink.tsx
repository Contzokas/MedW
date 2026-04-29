"use client"

import Link from "next/link"

export default function ManagementLink() {
  return (
    <Link
      href="/management"
      aria-label="Management Dashboard"
      className="theme-toggle-btn w-11 h-11 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors hover:bg-card/80"
    >
      <svg
        className="w-[18px] h-[18px] text-foreground/70"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
        />
      </svg>
    </Link>
  )
}
