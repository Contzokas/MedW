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
}

export interface TriageResponse {
  mts_level: number
  mts_label: string
  specialty: string
  doctor: Doctor
  reasoning: string
  redirect_url: string
  rag_used: boolean
}

export interface QueueEntry {
  patient_id: string
  mts_level: number
  specialty: string
  timestamp: string
}
