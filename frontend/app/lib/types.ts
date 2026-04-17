export interface TriageRequest {
  symptoms: string
  patient_id: string
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
