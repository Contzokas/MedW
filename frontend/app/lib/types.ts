export interface TriageRequest {
  symptoms: string
  patient_id: string
  lang: "en" | "el"
}

export interface Doctor {
  name: string
  specialty: string
  availability: boolean
  fallback_note: string | null
}

export interface TriageResponse {
  mts_level: number
  mts_label: string
  specialty: string
  doctor: Doctor
  reasoning: string
  redirect_url: string
  rag_used: boolean
  type?: "triage"
}

export interface FollowUpResponse {
  type: "follow_up"
  question: string
  follow_up_count: number
}

export interface TriageHistoryEntry {
  id: number
  patient_id: string
  symptoms: string
  mts_level: number
  mts_label: string
  specialty: string
  doctor_name: string
  doctor_specialty: string
  reasoning: string
  redirect_url: string
  rag_used: boolean
  lang: string
  created_at: string
}

export interface TriageHistoryList {
  entries: TriageHistoryEntry[]
  total: number
}

export interface QueueEntry {
  patient_id: string
  mts_level: number
  specialty: string
  timestamp: string
}
