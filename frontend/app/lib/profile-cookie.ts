import { UserProfile } from "@/app/lib/types"

const COOKIE_NAME = "medw_profile"
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function saveProfile(profile: UserProfile): void {
  if (typeof document === "undefined") return
  const value = encodeURIComponent(JSON.stringify(profile))
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE}; path=/; SameSite=Strict`
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function loadProfile(): UserProfile | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    const raw = decodeURIComponent(match.split("=").slice(1).join("="))
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

export function clearProfile(): void {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Strict`
}

// ---------------------------------------------------------------------------
// Serialise profile → human-readable medical history string for the LLM
// ---------------------------------------------------------------------------

export function serializeProfileForLLM(
  profile: UserProfile,
  lang: "en" | "el"
): string {
  const lines: string[] = []

  if (lang === "el") {
    if (profile.age !== null) lines.push(`Ηλικία: ${profile.age}`)
    if (profile.sex === "M") lines.push("Φύλο: Άρρεν")
    else if (profile.sex === "F") lines.push("Φύλο: Θήλυ")
    else if (profile.sex === "other") lines.push("Φύλο: Άλλο")
    if (profile.chronic_conditions.trim()) lines.push(`Χρόνιες παθήσεις: ${profile.chronic_conditions.trim()}`)
    if (profile.medications.trim()) lines.push(`Φάρμακα σε χρήση: ${profile.medications.trim()}`)
    if (profile.allergies.trim()) lines.push(`Αλλεργίες: ${profile.allergies.trim()}`)
    lines.push(`Κάπνισμα: ${profile.smoking ? "Ναι" : "Όχι"}`)
    lines.push(`Αλκοόλ: ${profile.alcohol ? "Ναι" : "Όχι"}`)
    if (profile.pregnant !== null) lines.push(`Εγκυμοσύνη: ${profile.pregnant ? "Ναι" : "Όχι"}`)
  } else {
    if (profile.age !== null) lines.push(`Age: ${profile.age}`)
    if (profile.sex === "M") lines.push("Biological sex: Male")
    else if (profile.sex === "F") lines.push("Biological sex: Female")
    else if (profile.sex === "other") lines.push("Biological sex: Other")
    if (profile.chronic_conditions.trim()) lines.push(`Chronic conditions: ${profile.chronic_conditions.trim()}`)
    if (profile.medications.trim()) lines.push(`Current medications: ${profile.medications.trim()}`)
    if (profile.allergies.trim()) lines.push(`Known allergies: ${profile.allergies.trim()}`)
    lines.push(`Smoking: ${profile.smoking ? "Yes" : "No"}`)
    lines.push(`Alcohol use: ${profile.alcohol ? "Yes" : "No"}`)
    if (profile.pregnant !== null) lines.push(`Pregnant: ${profile.pregnant ? "Yes" : "No"}`)
  }

  return lines.join("\n")
}
