import { TriageResponse } from "@/app/lib/types"

/**
 * Resolves the base URL for backend API calls.
 *
 * Priority:
 *   1. NEXT_PUBLIC_BACKEND_URL env var (set at build or runtime)
 *      – Use this when port-forwarding: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
 *   2. Falls back to "/backend" which is proxied by the Next.js rewrite
 *      (works inside the cluster where BACKEND_URL points to the real service)
 */
function getBackendBase(): string {
  if (typeof window !== "undefined") {
    // Client-side: check for a public env var first
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (envUrl) return envUrl.replace(/\/$/, "")
  }
  return "/backend"
}

export async function submitTriage(
  symptoms: string,
  patientId: string
): Promise<TriageResponse> {
  const base = getBackendBase()
  const res = await fetch(`${base}/api/v1/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  })

  if (!res.ok) {
    throw new Error(`Αποτυχία αξιολόγησης (κωδικός ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}
