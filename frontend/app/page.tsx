"use client"

import { useState } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import { TriageResponse } from "@/app/lib/types"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            <button
              onClick={() => setResult(null)}
              className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
              title="Επιστροφή στην αρχική"
            >
              MED<span className="text-blue-600">Ω</span>
            </button>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Έξυπνο σύστημα αξιολόγησης συμπτωμάτων και καθοδήγησης
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-10 transition-all duration-300">
          {result === null ? (
            <TriageForm onResult={setResult} />
          ) : (
            <TriageResult result={result} />
          )}
        </div>

        <div className="mt-10 text-center text-sm text-slate-500">
          <p>Σε περίπτωση απειλητικής για τη ζωή ανάγκης, καλέστε αμέσως το <span className="font-bold text-red-600">166</span>.</p>
        </div>
      </div>
    </main>
  )
}
