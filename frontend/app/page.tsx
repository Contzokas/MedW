"use client"

import { useState } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import { TriageResponse } from "@/app/lib/types"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <button
            onClick={() => setResult(null)}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            title="Back to home"
          >
            MED<span className="text-primary">Ω</span>
          </button>
          <p className="mt-6 text-xl font-medium text-foreground">
            Intelligent symptom assessment and guidance system
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-card p-8 shadow-2xl ring-1 ring-border sm:p-12 transition-all duration-300">
          {result === null ? (
            <TriageForm onResult={setResult} />
          ) : (
            <TriageResult result={result} />
          )}
        </div>

        <div className="mt-10 rounded-2xl border-2 border-destructive/20 bg-destructive/10 p-6 text-center shadow-sm">
          <p className="text-lg font-medium text-destructive">
            In case of a life-threatening emergency, call
          </p>
          <p className="mt-2 text-4xl font-black tracking-widest text-destructive">
            112
          </p>
        </div>
      </div>
    </main>
  )
}
