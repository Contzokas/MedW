export interface BodyArea {
  id: string
  label_en: string
  label_el: string
  icon: string
  symptoms: SymptomOption[]
}

export interface SymptomOption {
  id: string
  label_en: string
  label_el: string
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
    id: "head",
    label_en: "Head & Neurological",
    label_el: "Κεφαλή & Νευρολογικά",
    icon: "🧠",
    symptoms: [
      { id: "headache", label_en: "Headache", label_el: "Πονοκέφαλος" },
      { id: "dizziness", label_en: "Dizziness", label_el: "Ζάλη" },
      { id: "vision_problems", label_en: "Vision problems", label_el: "Προβλήματα όρασης" },
      { id: "hearing_loss", label_en: "Hearing loss", label_el: "Απώλεια ακοής" },
      { id: "confusion", label_en: "Confusion / Memory issues", label_el: "Σύγχυση / Προβλήματα μνήμης" },
    ],
  },
  {
    id: "chest",
    label_en: "Chest & Cardiac",
    label_el: "Θώρακας & Καρδιακά",
    icon: "❤️",
    symptoms: [
      { id: "chest_pain", label_en: "Chest pain", label_el: "Πόνος στο στήθος" },
      { id: "shortness_of_breath", label_en: "Shortness of breath", label_el: "Δύσπνοια" },
      { id: "palpitations", label_en: "Palpitations", label_el: "Παλμικοί" },
      { id: "cough", label_en: "Persistent cough", label_el: "Επίμονος βήχας" },
    ],
  },
  {
    id: "abdomen",
    label_en: "Abdomen & Digestive",
    label_el: "Κοιλιά & Πεπτικό",
    icon: "🫄",
    symptoms: [
      { id: "stomach_pain", label_en: "Stomach / Abdominal pain", label_el: "Πόνος στο στομάχι / Κοιλιά" },
      { id: "nausea_vomiting", label_en: "Nausea / Vomiting", label_el: "Ναυτία / Εμετός" },
      { id: "diarrhea", label_en: "Diarrhea", label_el: "Διάρροια" },
      { id: "constipation", label_en: "Constipation", label_el: "Δυσκοιλιότητα" },
      { id: "appetite_loss", label_en: "Loss of appetite", label_el: "Απώλεια όρεξης" },
    ],
  },
  {
    id: "musculoskeletal",
    label_en: "Muscles & Joints",
    label_el: "Μύες & Αρθρώσεις",
    icon: "🦴",
    symptoms: [
      { id: "joint_pain", label_en: "Joint pain", label_el: "Πόνος στις αρθρώσεις" },
      { id: "back_pain", label_en: "Back pain", label_el: "Πόντη στη μέση" },
      { id: "swelling", label_en: "Swelling", label_el: "Οίδημα" },
      { id: "muscle_pain", label_en: "Muscle pain / Cramps", label_el: "Μυικός πόνος / Κράμπες" },
    ],
  },
  {
    id: "skin",
    label_en: "Skin",
    label_el: "Δέρμα",
    icon: "🩹",
    symptoms: [
      { id: "rash", label_en: "Rash / Itching", label_el: "Εξάνθημα / Φαγούρα" },
      { id: "burns", label_en: "Burns", label_el: "Εγκαύματα" },
      { id: "wound", label_en: "Wound / Cut", label_el: "Πληγή / Κοπή" },
    ],
  },
  {
    id: "throat",
    label_en: "Throat & Respiratory",
    label_el: "Λαιμός & Αναπνευστικό",
    icon: "🤧",
    symptoms: [
      { id: "sore_throat", label_en: "Sore throat", label_el: "Πονόλαιμος" },
      { id: "runny_nose", label_en: "Runny nose / Congestion", label_el: "Βουλωμένη μύτη / Ρινόρροια" },
      { id: "fever", label_en: "Fever", label_el: "Πυρετός" },
    ],
  },
  {
    id: "mental",
    label_en: "Mental Health",
    label_el: "Ψυχική Υγεία",
    icon: "🧘",
    symptoms: [
      { id: "anxiety", label_en: "Anxiety", label_el: "Άγχος" },
      { id: "depression", label_en: "Depression / Low mood", label_el: "Κατάθλιψη / Χαμηλή διάθεση" },
      { id: "insomnia", label_en: "Insomnia / Sleep problems", label_el: "Αϋπνία / Προβλήματα ύπνου" },
      { id: "stress", label_en: "Stress", label_el: "Στρες" },
    ],
  },
  {
    id: "general",
    label_en: "General / Other",
    label_el: "Γενικά / Άλλο",
    icon: "🏥",
    symptoms: [
      { id: "fatigue", label_en: "Fatigue / Weakness", label_el: "Κόπωση / Αδυναμία" },
      { id: "weight_change", label_en: "Unexplained weight change", label_el: "Απροσδόκητη αλλαγή βάρους" },
      { id: "urinary", label_en: "Urinary problems", label_el: "Ουρολογικά προβλήματα" },
      { id: "other", label_en: "Other (describe below)", label_el: "Άλλο (περιγράψτε παρακάτω)" },
    ],
  },
]

export const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    id: "mild",
    label_en: "Mild",
    label_el: "Ήπιο",
    description_en: "Noticeable but not bothersome",
    description_el: "Ανιχνεύσιμο αλλά όχι ενοχλητικό",
  },
  {
    id: "moderate",
    label_en: "Moderate",
    label_el: "Μέτριο",
    description_en: "Uncomfortable, affecting daily activities",
    description_el: "Ενοχλητικό, επηρεάζει τις καθημερινές δραστηριότητες",
  },
  {
    id: "severe",
    label_en: "Severe",
    label_el: "Σοβαρό",
    description_en: "Very painful, cannot function normally",
    description_el: "Πολύ επώδυνο, αδυναμία φυσιολογικής λειτουργίας",
  },
]

export const DURATION_OPTIONS: DurationOption[] = [
  { id: "hours", label_en: "A few hours", label_el: "Λίγες ώρες" },
  { id: "today", label_en: "Since today", label_el: "Από σήμερα" },
  { id: "days", label_en: "A few days", label_el: "Λίγες μέρες" },
  { id: "week", label_en: "About a week", label_el: "Περίπου μια εβδομάδα" },
  { id: "weeks", label_en: "Several weeks", label_el: "Πολλές εβδομάδες" },
  { id: "longer", label_en: "Months or longer", label_el: "Μήνες ή περισσότερο" },
]

export interface QuickSymptom {
  id: string
  label_en: string
  label_el: string
  fill: string
  icon: string
}

export const QUICK_SYMPTOMS: QuickSymptom[] = [
  { id: "headache", label_en: "Headache", label_el: "Πονοκέφαλος", fill: "Headache", icon: "🤕" },
  { id: "chest_pain", label_en: "Chest pain", label_el: "Πόνος στο στήθος", fill: "Chest pain", icon: "💔" },
  { id: "fever", label_en: "Fever", label_el: "Πυρετός", fill: "Fever", icon: "🌡️" },
  { id: "cough", label_en: "Cough", label_el: "Βήχας", fill: "Cough", icon: "🫁" },
  { id: "nausea", label_en: "Nausea", label_el: "Ναυτία", fill: "Nausea / Vomiting", icon: "🤢" },
  { id: "dizziness", label_en: "Dizziness", label_el: "Ζάλη", fill: "Dizziness", icon: "😵" },
  { id: "back_pain", label_en: "Back pain", label_el: "Πόνος στη μέση", fill: "Back pain", icon: "🧎" },
  { id: "fatigue", label_en: "Fatigue", label_el: "Κόπωση", fill: "Fatigue / Weakness", icon: "😴" },
]
