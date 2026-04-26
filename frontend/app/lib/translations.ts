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
      projectTitle: "AI-powered Medical Triage for the NHS",
      projectBody1: "MEDΩ is an intelligent medical triage assistant designed for the Greek National Health System (ESY) and developed for the Kiefer AI Open Hackathon. When patients describe their symptoms, the system instantly provides a Manchester Triage System (MTS) classification and routes them to the correct medical specialty and an available doctor.",
      projectBody2: "By effectively addressing the issue of approximately 7 million annual appointments directed to the wrong specialty due to a lack of clinical guidance, MEDΩ aims to significantly reduce waiting times, enhance early intervention, and optimize the overall workflow for healthcare professionals.",
      members: {
        athanasios: "Athanasios Neofytos",
        constantinos: "Constantinos Tzokas",
        dimitrisD: "Dimitris Dimitriadis",
        dimitrisP: "Dimitris Papamargaritis",
        orestis: "Orestis Bushpreni",
        sotiris: "Sotiris Papadopoulos",
        stella: "Stella Alousi",
      },
      roles: {
        ux: "UX/UI Designer",
        ai: "AI Engineer",
        backend: "Backend Developer",
        frontend: "Frontend Developer",
        data: "Data Scientist",
        pm: "Product Manager",
      },
      socials: {
        linkedin: "LinkedIn",
        github: "GitHub",
      }
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
      projectTitle: "Ιατρική Διαλογή με Τεχνητή Νοημοσύνη για το ΕΣΥ",
      projectBody1: "Το MEDΩ είναι ένας έξυπνος ιατρικός βοηθός διαλογής (triage) που σχεδιάστηκε για το Εθνικό Σύστημα Υγείας (ΕΣΥ) και αναπτύχθηκε στο πλαίσιο του Kiefer AI Open Hackathon. Όταν οι ασθενείς περιγράφουν τα συμπτώματά τους, το σύστημα παρέχει άμεσα ταξινόμηση βάσει του συστήματος διαλογής Manchester (MTS) και τους κατευθύνει στη σωστή ιατρική ειδικότητα και στον κατάλληλο διαθέσιμο ιατρό.",
      projectBody2: "Αντιμετωπίζοντας αποτελεσματικά το πρόβλημα περίπου 7 εκατομμυρίων ετήσιων ραντεβού που κατευθύνονται σε λανθασμένη ειδικότητα λόγω έλλειψης κλινικής καθοδήγησης, το MEDΩ στοχεύει στη σημαντική μείωση των χρόνων αναμονής, στην ενίσχυση της έγκαιρης παρέμβασης και στη βελτιστοποίηση της συνολικής ροής εργασιών για τους επαγγελματίες υγείας.",
      members: {
        athanasios: "Αθανάσιος Νεόφυτος",
        constantinos: "Κωνσταντίνος Τζόκας",
        dimitrisD: "Δημήτρης Δημητριάδης",
        dimitrisP: "Δημήτρης Παπαμαργαρίτης",
        orestis: "Ορέστης Μπουσπρένι",
        sotiris: "Σωτήρης Παπαδόπουλος",
        stella: "Στέλλα Αλούση",
      },
      roles: {
        ux: "Σχεδιαστής UX/UI",
        ai: "Μηχανικός AI",
        backend: "Προγραμματιστής Backend",
        frontend: "Προγραμματιστής Frontend",
        data: "Επιστήμονας Δεδομένων",
        pm: "Υπεύθυνος Προϊόντος",
      }
    },
  },
} satisfies Record<Lang, unknown>
