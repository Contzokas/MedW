import { FollowUpResponse, TriageResponse, TriageHistoryList, TriageHistoryEntry } from "@/app/lib/types"
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
      ...(followUpCount > 0 && { follow_up_count: followUpCount }),
      ...(conversationContext && { conversation_context: conversationContext }),
    }),
  })

  if (!res.ok) {
    throw new Error(`Triage request failed (status ${res.status})`)
  }

  return res.json() as Promise<TriageResponse | FollowUpResponse>
}

export async function getTriageHistory(
  patientId: string,
  limit: number = 20,
  offset: number = 0
): Promise<TriageHistoryList> {
  const apiBase = await resolveApiBase()
  const res = await fetch(
    buildApiUrl(apiBase, `/api/v1/history/${patientId}?limit=${limit}&offset=${offset}`)
  )
  if (!res.ok) throw new Error(`History fetch failed (status ${res.status})`)
  return res.json()
}

export async function getTriageHistoryEntry(
  patientId: string,
  entryId: number
): Promise<TriageHistoryEntry> {
  const apiBase = await resolveApiBase()
  const res = await fetch(
    buildApiUrl(apiBase, `/api/v1/history/${patientId}/${entryId}`)
  )
  if (!res.ok) throw new Error(`History entry fetch failed (status ${res.status})`)
  return res.json()
}
