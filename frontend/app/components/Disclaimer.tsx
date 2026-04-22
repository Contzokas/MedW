export default function Disclaimer() {
  return (
    <div
      role="note"
      aria-label="Σημαντική ιατρική ανακοίνωση"
      className="mb-6 rounded-lg border border-warning bg-warning/10 p-4 text-base"
    >
      <p className="font-semibold text-warning">
        ⚠️ Σημαντική Ανακοίνωση
      </p>
      <p className="mt-1 text-foreground">
        Το MEDΩ είναι σύστημα τεχνητής νοημοσύνης για αρχική αξιολόγηση συμπτωμάτων
        και <strong>δεν αποτελεί κλινική διάγνωση</strong>. Τα αποτελέσματα είναι
        ενδεικτικά και δεν υποκαθιστούν τη γνώμη ιατρού. Σε περίπτωση επείγοντος,
        επικοινωνήστε με το <strong>166 (ΕΚΑΒ)</strong>.
      </p>
    </div>
  )
}
