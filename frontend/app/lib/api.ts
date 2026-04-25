import { TriageResponse } from "@/app/lib/types"
import { buildApiUrl, resolveApiBase } from "@/app/lib/backendResolver"

export async function submitTriage(
  symptoms: string,
  patientId: string
): Promise<TriageResponse> {
  const apiBase = await resolveApiBase()

  const res = await fetch(buildApiUrl(apiBase, "/api/v1/triage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  })

  if (!res.ok) {
    throw new Error(`Assessment failed (code ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}
