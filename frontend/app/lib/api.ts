import { FollowUpResponse, TriageResponse } from "@/app/lib/types"
import { buildApiUrl, resolveApiBase } from "@/app/lib/backendResolver"

export async function submitTriage(
  symptoms: string,
  patientId: string,
  lang: "en" | "el",
  followUpCount: number = 0,
  conversationContext: string = ""
): Promise<TriageResponse | FollowUpResponse> {
  const apiBase = await resolveApiBase()

  const res = await fetch(buildApiUrl(apiBase, "/api/v1/triage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symptoms,
      patient_id: patientId,
      lang,
      follow_up_count: followUpCount,
      conversation_context: conversationContext,
    }),
  })

  if (!res.ok) {
    throw new Error(`Triage request failed (status ${res.status})`)
  }

  return res.json() as Promise<TriageResponse | FollowUpResponse>
}
