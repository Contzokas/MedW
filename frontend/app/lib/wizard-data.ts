export interface BodyArea {
  id: string
  icon: string
  label_en: string
  label_el: string
  symptoms: { id: string; label_en: string; label_el: string }[]
}

export interface SeverityOption {
  id: string
  label_en: string
  label_el: string
  description_en: string
  description_el: string
}

export interface DurationOption {
  id: string
  label_en: string
  label_el: string
}

export const BODY_AREAS: BodyArea[] = [
  {
    id: "head-neck",
    icon: "🧠",
    label_en: "Head & Neck",
    label_el: "Κεφάλι & Λαιμός",
    symptoms: [
      { id: "headache", label_en: "Headache", label_el: "Πονοκέφαλος" },
      { id: "dizziness", label_en: "Dizziness", label_el: "Ζάλη" },
      { id: "sore-throat", label_en: "Sore Throat", label_el: "Πονόλαιμος" },
      { id: "neck-pain", label_en: "Neck Pain", label_el: "Πόνος στον Αυχένα" },
      { id: "vision-issues", label_en: "Vision Issues", label_el: "Προβλήματα Όρασης" },
      { id: "ear-pain", label_en: "Ear Pain", label_el: "Πόνος στο Αυτί" },
    ],
  },
  {
    id: "chest",
    icon: "🫁",
    label_en: "Chest",
    label_el: "Στήθος",
    symptoms: [
      { id: "chest-pain", label_en: "Chest Pain", label_el: "Πόνος στο Στήθος" },
      { id: "breathing", label_en: "Difficulty Breathing", label_el: "Δυσκολία στην Αναπνοή" },
      { id: "palpitations", label_en: "Palpitations", label_el: "Ταχυπαλμία" },
      { id: "cough", label_en: "Cough", label_el: "Βήχας" },
    ],
  },
  {
    id: "abdomen",
    icon: "🫄",
    label_en: "Abdomen",
    label_el: "Κοιλιά",
    symptoms: [
      { id: "abdominal-pain", label_en: "Abdominal Pain", label_el: "Πόνος στην Κοιλιά" },
      { id: "nausea", label_en: "Nausea", label_el: "Ναυτία" },
      { id: "vomiting", label_en: "Vomiting", label_el: "Εμετός" },
      { id: "diarrhea", label_en: "Diarrhea", label_el: "Διάρροια" },
      { id: "constipation", label_en: "Constipation", label_el: "Δυσκοιλιότητα" },
    ],
  },
  {
    id: "back-spine",
    icon: "🦴",
    label_en: "Back & Spine",
    label_el: "Πλάτη & Σπονδυλική Στήλη",
    symptoms: [
      { id: "back-pain", label_en: "Back Pain", label_el: "Πόνος στην Πλάτη" },
      { id: "lower-back", label_en: "Lower Back Pain", label_el: "Πόνος στη Μέση" },
      { id: "spine-issues", label_en: "Spine Issues", label_el: "Προβλήματα Σπονδυλικής Στήλης" },
    ],
  },
  {
    id: "limbs",
    icon: "💪",
    label_en: "Arms & Legs",
    label_el: "Χέρια & Πόδια",
    symptoms: [
      { id: "joint-pain", label_en: "Joint Pain", label_el: "Πόνος στις Αρθρώσεις" },
      { id: "muscle-pain", label_en: "Muscle Pain", label_el: "Μυϊκός Πόνος" },
      { id: "swelling", label_en: "Swelling", label_el: "Πρήξιμο" },
      { id: "numbness", label_en: "Numbness", label_el: "Μούδιασμα" },
      { id: "injury", label_en: "Injury", label_el: "Τραυματισμός" },
    ],
  },
  {
    id: "skin",
    icon: "🔴",
    label_en: "Skin",
    label_el: "Δέρμα",
    symptoms: [
      { id: "rash", label_en: "Rash", label_el: "Εξάνθημα" },
      { id: "itching", label_en: "Itching", label_el: "Κνησμός" },
      { id: "burn", label_en: "Burn", label_el: "Έγκαυμα" },
      { id: "bruising", label_en: "Bruising", label_el: "Μώλωπες" },
    ],
  },
  {
    id: "general",
    icon: "🌡️",
    label_en: "General / Systemic",
    label_el: "Γενικά / Συστηματικά",
    symptoms: [
      { id: "fever", label_en: "Fever", label_el: "Πυρετός" },
      { id: "fatigue", label_en: "Fatigue", label_el: "Κόπωση" },
      { id: "anxiety", label_en: "Anxiety", label_el: "Άγχος" },
      { id: "depression", label_en: "Depression", label_el: "Κατάθλιψη" },
      { id: "weight-loss", label_en: "Weight Loss", label_el: "Απώλεια Βάρους" },
    ],
  },
]

export const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    id: "mild",
    label_en: "Mild",
    label_el: "Ήπια",
    description_en: "Noticeable but not interfering with daily activities",
    description_el: "Αισθητή αλλά δεν επηρεάζει τις καθημερινές δραστηριότητες",
  },
  {
    id: "moderate",
    label_en: "Moderate",
    label_el: "Μέτρια",
    description_en: "Interferes with some daily activities",
    description_el: "Επηρεάζει κάποιες καθημερινές δραστηριότητες",
  },
  {
    id: "severe",
    label_en: "Severe",
    label_el: "Σοβαρή",
    description_en: "Prevents most daily activities",
    description_el: "Εμποδίζει τις περισσότερες καθημερινές δραστηριότητες",
  },
]

export const DURATION_OPTIONS: DurationOption[] = [
  { id: "hours", label_en: "Hours", label_el: "Ώρες" },
  { id: "days", label_en: "Days", label_el: "Ημέρες" },
  { id: "weeks", label_en: "Weeks", label_el: "Εβδομάδες" },
  { id: "months", label_en: "Months", label_el: "Μήνες" },
  { id: "years", label_en: "Years", label_el: "Χρόνια" },
]

export const QUICK_SYMPTOMS = [
  { id: "headache", icon: "🤕", label_en: "Headache", label_el: "Πονοκέφαλος", fill: "I have a headache" },
  { id: "fever", icon: "🤒", label_en: "Fever", label_el: "Πυρετός", fill: "I have a fever" },
  { id: "cough", icon: "😤", label_en: "Cough", label_el: "Βήχας", fill: "I have a cough" },
  { id: "chest-pain", icon: "💔", label_en: "Chest Pain", label_el: "Πόνος στο Στήθος", fill: "I have chest pain" },
  { id: "stomach", icon: "🤢", label_en: "Stomach Ache", label_el: "Στομαχόπονος", fill: "I have a stomach ache" },
  { id: "back-pain", icon: "🧎", label_en: "Back Pain", label_el: "Πόνος στην Πλάτη", fill: "I have back pain" },
  { id: "rash", icon: "🔴", label_en: "Rash", label_el: "Εξάνθημα", fill: "I have a rash" },
  { id: "dizzy", icon: "😵", label_en: "Dizziness", label_el: "Ζάλη", fill: "I feel dizzy" },
  { id: "fatigue", icon: "😴", label_en: "Fatigue", label_el: "Κόπωση", fill: "I feel very tired" },
  { id: "anxiety", icon: "😰", label_en: "Anxiety", label_el: "Άγχος", fill: "I feel anxious" },
]
