import { TriageResponse } from "@/app/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000"

export async function submitTriage(
  symptoms: string,
  patientId: string
): Promise<TriageResponse> {
  const res = await fetch(`${API_BASE}/api/v1/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  })

  if (!res.ok) {
    throw new Error(`Αποτυχία αξιολόγησης (κωδικός ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}
