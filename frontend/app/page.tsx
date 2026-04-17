"use client"

import { useState } from "react"
import TriageForm from "@/app/components/TriageForm"
import TriageResult from "@/app/components/TriageResult"
import { TriageResponse } from "@/app/lib/types"

export default function Home() {
  const [result, setResult] = useState<TriageResponse | null>(null)

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900">
            MEDΩ
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Σύστημα αξιολόγησης συμπτωμάτων
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-md">
          {result === null ? (
            <TriageForm onResult={setResult} />
          ) : (
            <TriageResult result={result} />
          )}
        </div>
      </div>
    </main>
  )
}
