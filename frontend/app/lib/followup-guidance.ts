export interface GuidanceStep {
  title_en: string
  title_el: string
  description_en: string
  description_el: string
}

export const MTS_GUIDANCE: Record<number, GuidanceStep[]> = {
  1: [
    {
      title_en: "Call 166 (EKAV)",
      title_el: "Καλέστε το 166 (ΕΚΑΒ)",
      description_en: "This is a life-threatening emergency. Call an ambulance immediately.",
      description_el: "Αυτή είναι απειλητική για τη ζωή ανάγκη. Καλέστε αμέσως ασθενοφόρο.",
    },
    {
      title_en: "Stay calm and still",
      title_el: "Μείνετε ήρεμοι και ακίνητοι",
      description_en: "Do not move unless necessary. Wait for emergency services.",
      description_el: "Μην κινηθείτε εκτός αν χρειάζεται. Περιμένετε τις υπηρεσίες έκτακτης ανάγκης.",
    },
  ],
  2: [
    {
      title_en: "Go to the nearest Emergency Department",
      title_el: "Πηγαίνετε στο πιο κοντινό ΤΕΠ",
      description_en: "Do not drive yourself. Ask someone to take you or call a taxi.",
      description_el: "Μην οδηγήσετε μόνοι σας. Ζητήστε από κάποιον να σας μεταφέρει ή καλέστε ταξί.",
    },
    {
      title_en: "Contact your doctor",
      title_el: "Επικοινωνήστε με τον γιατρό σας",
      description_en: "If unable to reach the ER, contact your doctor for guidance.",
      description_el: "Αν δεν μπορείτε να φτάσετε στο ΤΕΠ, επικοινωνήστε με τον γιατρό σας.",
    },
  ],
  3: [
    {
      title_en: "See a doctor within 24 hours",
      title_el: "Επισκεφθείτε γιατρό εντός 24 ωρών",
      description_en: "Book an appointment today or visit an urgent care center.",
      description_el: "Κλείστε ραντεβού σήμερα ή επισκεφθείτε κέντρο άμεσης φροντίδας.",
    },
    {
      title_en: "Visit a pharmacy",
      title_el: "Επισκεφθείτε φαρμακείο",
      description_en: "A pharmacist can provide initial advice for some conditions.",
      description_el: "Ένας φαρμακοποιός μπορεί να δώσει αρχικές συμβουλές για κάποιες παθήσεις.",
    },
  ],
  4: [
    {
      title_en: "Book an appointment",
      title_el: "Κλείστε ραντεβού",
      description_en: "Schedule a visit with the recommended specialist in the coming days.",
      description_el: "Προγραμματίστε μια επίσκεψη με τον συνιστώμενο ειδικό τις επόμενες μέρες.",
    },
    {
      title_en: "Self-care",
      title_el: "Αυτοφροντίδα",
      description_en: "Rest, hydrate, and monitor your symptoms. If they worsen, seek medical attention.",
      description_el: "Ξεκουραστείτε, ενυδατωθείτε και παρακολουθήστε τα συμπτώματά σας.",
    },
  ],
  5: [
    {
      title_en: "Monitor your health",
      title_el: "Παρακολουθήστε την υγεία σας",
      description_en: "Your symptoms appear non-urgent. Consult a doctor if things change.",
      description_el: "Τα συμπτώματά σας φαίνεται να μην είναι επείγοντα. Συμβουλευτείτε γιατρό αν αλλάξουν.",
    },
    {
      title_en: "Health resources",
      title_el: "Πόροι υγείας",
      description_en: "Visit finddoctors.gov.gr to find a doctor near you.",
      description_el: "Επισκεφθείτε το finddoctors.gov.gr για να βρείτε γιατρό κοντά σας.",
    },
  ],
}
