import { TriageResponse } from "@/app/lib/types"

/**
 * All requests go through /api/proxy/... which is a Next.js API route
 * that reads BACKEND_URL at runtime and proxies to the real backend.
 * This works in all scenarios: in-cluster, docker-compose, and port-forward.
 */
const API_PROXY = "/api/proxy"

export async function submitTriage(
  symptoms: string,
  patientId: string
): Promise<TriageResponse> {
  const res = await fetch(`${API_PROXY}/api/v1/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  })

  if (!res.ok) {
    throw new Error(`Αποτυχία αξιολόγησης (κωδικός ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}
