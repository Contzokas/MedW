export type Lang = "en" | "el"

export const translations = {
  en: {
    emergency: "In case of a life-threatening emergency, call",
    hero: {
      subtitle: "Intelligent symptom assessment and guidance · AI Triage",
      scroll: "scroll",
      logoTitle: "Return to home",
      scrollLabel: "Scroll to about section",
    },
    form: {
      label: "Symptoms",
      placeholder: "Describe your symptoms (e.g. chest pain, difficulty breathing)...",
      submit: "Assess Symptoms",
      loading: "Analysis in progress...",
      error: "An error occurred. Please try again.",
    },
    result: {
      mtsLabel: "Emergency Level (MTS)",
      specialty: "Recommended Specialty",
      reasoning: "Reasoning",
      back: "New assessment",
    },
    doctor: {
      label: "Recommended Doctor",
      link: "Find the doctor at finddoctors.gov.gr",
    },
    disclaimer: {
      ariaLabel: "Important medical notice",
      title: "⚠️ Important Notice",
      body: "MEDΩ is an AI system for initial symptom assessment and ",
      bodyStrong: "does not constitute a clinical diagnosis",
      body2: ". Results are indicative and do not replace a doctor's opinion. In case of emergency, contact ",
      bodyStrong2: "166 (EKAV)",
      body3: ".",
    },
    team: {
      about: "About the Project",
      team: "The Team",
    },
  },
  el: {
    emergency: "Σε περίπτωση απειλητικής για τη ζωή ανάγκης, καλέστε",
    hero: {
      subtitle: "Σύστημα αξιολόγησης συμπτωμάτων · AI Triage",
      scroll: "scroll",
      logoTitle: "Επιστροφή στην αρχή",
      scrollLabel: "Κύλιση στην ενότητα Σχετικά",
    },
    form: {
      label: "Συμπτώματα",
      placeholder: "Περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία αναπνοής)...",
      submit: "Εκτίμηση Συμπτωμάτων",
      loading: "Ανάλυση σε εξέλιξη...",
      error: "Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.",
    },
    result: {
      mtsLabel: "Επίπεδο Επείγοντος (MTS)",
      specialty: "Συνιστώμενη Ειδικότητα",
      reasoning: "Αιτιολόγηση",
      back: "Νέα αξιολόγηση",
    },
    doctor: {
      label: "Συνιστώμενος Ιατρός",
      link: "Βρείτε τον γιατρό στο finddoctors.gov.gr",
    },
    disclaimer: {
      ariaLabel: "Σημαντική ιατρική ειδοποίηση",
      title: "⚠️ Σημαντική Ενημέρωση",
      body: "Το MEDΩ είναι σύστημα τεχνητής νοημοσύνης για αρχική αξιολόγηση συμπτωμάτων και ",
      bodyStrong: "δεν αποτελεί κλινική διάγνωση",
      body2: ". Τα αποτελέσματα είναι ενδεικτικά και δεν υποκαθιστούν τη γνώμη ιατρού. Σε περίπτωση επείγοντος, επικοινωνήστε με το ",
      bodyStrong2: "166 (ΕΚΑΒ)",
      body3: ".",
    },
    team: {
      about: "Για το Έργο",
      team: "Η Ομάδα",
    },
  },
} satisfies Record<Lang, unknown>
