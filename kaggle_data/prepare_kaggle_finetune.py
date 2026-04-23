# /// script
# dependencies = [
#   "pandas",
# ]
# ///
"""Convert Kaggle Symptom2Disease.csv into fine-tuning JSONL (chatml) and merge with existing data."""
import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
CSV_PATH = DATA_DIR / "Symptom2Disease.csv"
OUTPUT_PATH = DATA_DIR / "finetune_data.jsonl"
EXISTING_PATH = Path(__file__).parent.parent / "artifacts" / "symptom_combinations" / "finetune_data.jsonl"

SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

# Map each of the 24 Kaggle diseases to MTS level, Greek specialty, and English specialty.
# MTS: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent
DISEASE_MAP: dict[str, dict] = {
    "Acne":                    {"mts_level": 5, "specialty_el": "Δερματολογία",          "specialty_en": "Dermatology"},
    "allergy":                 {"mts_level": 3, "specialty_el": "Αλλεργιολογία",         "specialty_en": "Allergology"},
    "Arthritis":               {"mts_level": 4, "specialty_el": "Ρευματολογία",          "specialty_en": "Rheumatology"},
    "Bronchial Asthma":        {"mts_level": 2, "specialty_el": "Πνευμονολογία",         "specialty_en": "Pulmonology"},
    "Cervical spondylosis":    {"mts_level": 4, "specialty_el": "Ορθοπεδική",            "specialty_en": "Orthopedics"},
    "Chicken pox":             {"mts_level": 4, "specialty_el": "Δερματολογία",          "specialty_en": "Dermatology"},
    "Common Cold":             {"mts_level": 5, "specialty_el": "Γενική Ιατρική",        "specialty_en": "General Practice"},
    "Dengue":                  {"mts_level": 2, "specialty_el": "Ειδικές Λοιμώξεις",     "specialty_en": "Infectious Disease"},
    "diabetes":                {"mts_level": 3, "specialty_el": "Ενδοκρινολογία",        "specialty_en": "Endocrinology"},
    "Dimorphic Hemorrhoids":   {"mts_level": 4, "specialty_el": "Γενική Χειρουργική",    "specialty_en": "General Surgery"},
    "drug reaction":           {"mts_level": 2, "specialty_el": "Αλλεργιολογία",         "specialty_en": "Allergology"},
    "Fungal infection":        {"mts_level": 5, "specialty_el": "Δερματολογία",          "specialty_en": "Dermatology"},
    "gastroesophageal reflux disease": {"mts_level": 4, "specialty_el": "Γαστρεντερολογία", "specialty_en": "Gastroenterology"},
    "Hypertension":            {"mts_level": 3, "specialty_el": "Καρδιολογία",           "specialty_en": "Cardiology"},
    "Impetigo":                {"mts_level": 5, "specialty_el": "Δερματολογία",          "specialty_en": "Dermatology"},
    "Jaundice":                {"mts_level": 3, "specialty_el": "Γαστρεντερολογία",      "specialty_en": "Gastroenterology"},
    "Malaria":                 {"mts_level": 2, "specialty_el": "Ειδικές Λοιμώξεις",     "specialty_en": "Infectious Disease"},
    "Migraine":                {"mts_level": 3, "specialty_el": "Νευρολογία",            "specialty_en": "Neurology"},
    "peptic ulcer disease":    {"mts_level": 3, "specialty_el": "Γαστρεντερολογία",      "specialty_en": "Gastroenterology"},
    "Pneumonia":               {"mts_level": 2, "specialty_el": "Πνευμονολογία",         "specialty_en": "Pulmonology"},
    "Psoriasis":               {"mts_level": 4, "specialty_el": "Δερματολογία",          "specialty_en": "Dermatology"},
    "Typhoid":                 {"mts_level": 2, "specialty_el": "Ειδικές Λοιμώξεις",     "specialty_en": "Infectious Disease"},
    "urinary tract infection": {"mts_level": 3, "specialty_el": "Ουρολογία",             "specialty_en": "Urology"},
    "Varicose Veins":          {"mts_level": 5, "specialty_el": "Αγγειοχειρουργική",      "specialty_en": "Vascular Surgery"},
}

MTS_LABELS = {1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-urgent"}


def build_assistant_response(disease: str, symptoms: str, info: dict) -> str:
    mts_level = info["mts_level"]
    reasoning = (
        f"Based on the described symptoms consistent with {disease.lower()}, "
        f"this case is classified as {MTS_LABELS[mts_level]} (MTS level {mts_level}). "
        f"Referral to {info['specialty_el']} is recommended."
    )
    return json.dumps({
        "mts_level": mts_level,
        "mts_label": MTS_LABELS[mts_level],
        "specialty": info["specialty_el"],
        "reasoning": reasoning,
    }, ensure_ascii=False)


def build_kaggle_examples() -> list[dict]:
    examples = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = row["label"]
            text = row["text"]
            info = DISEASE_MAP.get(label)
            if info is None:
                print(f"  WARNING: no mapping for '{label}' — skipping")
                continue

            human_msg = (
                f"Patient symptoms:\n{text}\n\n"
                "Return JSON with exactly these fields:\n"
                '{"mts_level": <integer 1-5>, "mts_label": "<string>", '
                '"specialty": "<Greek specialty name>", "reasoning": "<explanation>"}}\n\n'
                "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
                "specialty must be a Greek medical specialty name "
                "(e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική, Δερματολογία)."
            )
            assistant_msg = build_assistant_response(label, text, info)

            examples.append({
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": human_msg},
                    {"role": "assistant", "content": assistant_msg},
                ]
            })
    return examples


def load_existing_examples() -> list[dict]:
    if not EXISTING_PATH.exists():
        return []
    examples = []
    with open(EXISTING_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    return examples


def main():
    print("=== Kaggle Symptom2Disease Fine-Tuning Data ===")

    kaggle_examples = build_kaggle_examples()
    existing_examples = load_existing_examples()

    all_examples = existing_examples + kaggle_examples

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for ex in all_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"  Existing examples:  {len(existing_examples)}")
    print(f"  Kaggle examples:    {len(kaggle_examples)}")
    print(f"  Total examples:     {len(all_examples)}")
    print(f"  Output:             {OUTPUT_PATH}")

    # Distribution summary
    from collections import Counter
    mts_counts = Counter()
    specialty_counts = Counter()
    source = "existing" if len(existing_examples) > 0 else "kaggle"
    for ex in all_examples:
        assistant = ex["messages"][-1]["content"]
        resp = json.loads(assistant)
        mts_counts[resp["mts_level"]] += 1
        specialty_counts[resp["specialty"]] += 1

    print("\nMTS distribution:")
    for level in sorted(mts_counts):
        print(f"  Level {level} ({MTS_LABELS[level]}): {mts_counts[level]}")

    print("\nSpecialty distribution:")
    for spec, count in specialty_counts.most_common():
        print(f"  {spec}: {count}")


if __name__ == "__main__":
    main()
