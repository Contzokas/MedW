import { TriageResponse, UserProfile } from "@/app/lib/types"
import { buildApiUrl, resolveApiBase } from "@/app/lib/backendResolver"
import { serializeProfileForLLM } from "@/app/lib/profile-cookie"

export async function submitTriage(
  symptoms: string,
  patientId: string,
  lang: "en" | "el",
  profile?: UserProfile | null
): Promise<TriageResponse> {
  const apiBase = await resolveApiBase()

  const patient_profile = profile
    ? serializeProfileForLLM(profile, lang)
    : undefined

  const res = await fetch(buildApiUrl(apiBase, "/api/v1/triage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId, lang, patient_profile }),
  })

  if (!res.ok) {
    throw new Error(`Triage request failed (status ${res.status})`)
  }

  return res.json() as Promise<TriageResponse>
}

