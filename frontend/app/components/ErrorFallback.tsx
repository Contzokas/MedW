"use client"

import { useState } from "react"
import { useLang } from "@/app/lib/lang-context"

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function useLangSafe() {
  try {
    return useLang()
  } catch {
    return { lang: "en" as const }
  }
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { lang } = useLangSafe()

  const isEn = lang === "en"

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-card p-6 sm:p-8 text-center space-y-4">
        {/* Warning icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-foreground">
          {isEn ? "Something went wrong" : "Κάτι πήγε στραβά"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "An unexpected error occurred. Please try refreshing the page."
            : "Προέκυψε ένα μη αναμενόμενο σφάλμα. Παρακαλώ δοκιμάστε να φορτώσετε ξανά τη σελίδα."}
        </p>

        <button
          type="button"
          onClick={resetErrorBoundary}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isEn ? "Refresh page" : "Ανανέωση σελίδας"}
        </button>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {showDetails
            ? isEn
              ? "Hide details"
              : "Απόκρυψη λεπτομερειών"
            : isEn
              ? "Show details"
              : "Εμφάνιση λεπτομερειών"}
        </button>

        {showDetails && (
          <pre className="mt-2 rounded-md bg-muted p-3 text-left text-xs text-muted-foreground overflow-auto max-h-40">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        )}
      </div>
    </div>
  )
}
