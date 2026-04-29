export interface UserProfile {
  age: number | null
  sex: "M" | "F" | "other" | null
  chronic_conditions: string
  medications: string
  allergies: string
  smoking: boolean
  alcohol: boolean
  pregnant: boolean | null
}

export interface TriageRequest {
  symptoms: string
  patient_id: string
  lang: "en" | "el"
  patient_profile?: string
}

export interface Doctor {
  name: string
  specialty: string
  availability: boolean
  fallback_note: string | null
  city: string | null
  lat: number | null
  lon: number | null
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

export interface RedirectToWizardResponse {
  type: "redirect_to_wizard"
  guidance_message: string
}

export interface UncertainResultResponse {
  type: "uncertain_result"
  message: string
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
