"use client";

import { useState } from "react";
import { FormEvent } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const patient_id = crypto.randomUUID();
      const res = await fetch(`${API_BASE}/api/v1/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, patient_id }),
      });

      if (!res.ok) {
        throw new Error("Triage failed.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-blue-900">
            MEDΩ - Εθνικό Σύστημα Υγείας
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Τεχνητή Νοημοσύνη στην υπηρεσία της υγείας.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="symptoms" className="sr-only">
                Συμπτώματα
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                rows={5}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Παρακαλώ περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία στην αναπνοή)..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Ανάλυση..." : "Counselling / Εκτίμηση"}
            </button>
          </div>
        </form>

        {error && <div className="text-red-600 text-center mt-4">{error}</div>}

        {result && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Αποτέλεσμα Triage (MTS)</h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Επίπεδο Επείγοντος</dt>
                <dd className="mt-1 text-sm text-gray-900 font-bold">
                  Επίπεδο {result.mts_level} - {result.mts_label}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Προτεινόμενη Ειδικότητα</dt>
                <dd className="mt-1 text-sm text-gray-900">{result.specialty}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Αιτιολογία</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-md">
                  {result.reasoning}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Προτεινόμενος Ιατρός</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {result.doctor ? (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <p className="font-semibold text-blue-900">Dr. {result.doctor.name}</p>
                      <p className="text-blue-800">{result.doctor.specialty}</p>
                      {result.doctor.fallback_note && (
                        <p className="text-yellow-700 text-xs mt-1">{result.doctor.fallback_note}</p>
                      )}
                      {result.redirect_url && (
                        <a
                          href={result.redirect_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block bg-white text-blue-600 font-medium px-4 py-2 rounded shadow-sm hover:bg-blue-50"
                        >
                          Κλείστε Ραντεβού
                        </a>
                      )}
                    </div>
                  ) : (
                    "Δεν βρέθηκε διαθέσιμος ιατρός."
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-8 text-xs text-gray-500 text-center border-t pt-4">
              <strong>Medical Disclaimer:</strong> This tool uses Artificial Intelligence (Mistral-7B) to provide triage guidance. It is not a replacement for professional medical diagnosis or treatment. If you are experiencing a life-threatening emergency, call 166 immediately.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
