# /// script
# dependencies = [
#   "pyarrow",
# ]
# ///
"""Convert symptom_combinations dataset + test results into fine-tuning JSONL for Ollama (chatml format)."""
import json
from pathlib import Path

import pyarrow.parquet as pq

DATASET_DIR = Path(__file__).parent / "artifacts" / "symptom_combinations"
OUTPUT_PATH = DATASET_DIR / "finetune_data.jsonl"

SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

MTS_LABELS = {1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-urgent"}
URGENCY_TO_MTS = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}

BODY_REGION_SPECIALTY = {
    "Head": "Νευρολογία",
    "Chest": "Καρδιολογία",
    "Abdomen": "Γαστρεντερολογία",
    "Upper Limbs": "Ορθοπεδική",
    "Lower Limbs": "Ορθοπεδική",
    "Back": "Ορθοπεδική",
    "Skin": "Δερματολογία",
    "General": "Γενική Ιατρική",
}


def load_records():
    table = pq.read_table(str(DATASET_DIR / "parquet-files" / "batch_00000.parquet"))
    df = table.to_pandas()
    records = []
    for _, row in df.iterrows():
        profile = row["symptom_profile"]
        records.append({
            "description": row["description"],
            "body_region": row["body_region"],
            "severity": row["severity"],
            "pain_level": int(row["pain_level"]),
            "duration_category": row["duration_category"],
            "primary_symptom": profile["primary_symptom"],
            "additional_symptoms": profile["additional_symptoms"],
            "recommended_urgency": profile["recommended_urgency"],
        })
    return records


def build_assistant_response(rec):
    mts_level = URGENCY_TO_MTS[rec["recommended_urgency"]]
    mts_label = MTS_LABELS[mts_level]
    specialty = BODY_REGION_SPECIALTY.get(rec["body_region"], "Γενική Ιατρική")

    reasoning_parts = [
        f"Based on the described symptoms of {rec['primary_symptom'].lower()}",
        f"({' and '.join(rec['additional_symptoms'][:2])})" if len(rec['additional_symptoms']) > 0 else "",
        f" in the {rec['body_region'].lower()} region",
        f" with {rec['severity'].lower()} severity and pain level {rec['pain_level']}/10,",
        f" this case is classified as {mts_label} (MTS level {mts_level}).",
        f" Referral to {specialty} is recommended.",
    ]
    reasoning = "".join(reasoning_parts)

    return json.dumps({
        "mts_level": mts_level,
        "mts_label": mts_label,
        "specialty": specialty,
        "reasoning": reasoning,
    }, ensure_ascii=False)


def build_human_message(rec):
    symptoms_text = f"{rec['description']}"
    return (
        f"Patient symptoms:\n{symptoms_text}\n\n"
        "Return JSON with exactly these fields:\n"
        '{"mts_level": <integer 1-5>, "mts_label": "<string>", '
        '"specialty": "<Greek specialty name>", "reasoning": "<explanation>"}}\n\n'
        "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
        "specialty must be a Greek medical specialty name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική)."
    )


def main():
    records = load_records()

    # Prioritize misclassified records for fine-tuning (they're the most valuable)
    test_results_path = DATASET_DIR / "test_results.json"
    misclassified_ids = set()
    if test_results_path.exists():
        with open(test_results_path) as f:
            test_results = json.load(f)
        misclassified_ids = {r["id"] for r in test_results if not r["match"]}

    lines = []
    for i, rec in enumerate(records):
        human_msg = build_human_message(rec)
        assistant_msg = build_assistant_response(rec)

        entry = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": human_msg},
                {"role": "assistant", "content": assistant_msg},
            ]
        }

        # Duplicate misclassified records to give them more weight
        lines.append(entry)
        if i in misclassified_ids:
            lines.append(entry)  # 2x for off-by-1
            # Also add a variation with higher urgency emphasis for critical cases
            if rec["recommended_urgency"] == "Critical":
                critical_msg = (
                    f"Patient symptoms (EMERGENCY):\n{rec['description']}\n\n"
                    "Return JSON with exactly these fields:\n"
                    '{"mts_level": <integer 1-5>, "mts_label": "<string>", '
                    '"specialty": "<Greek specialty name>", "reasoning": "<explanation>"}}\n\n'
                    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
                    "specialty must be a Greek medical specialty name."
                )
                lines.append({
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": critical_msg},
                        {"role": "assistant", "content": assistant_msg},
                    ]
                })

    with open(OUTPUT_PATH, "w") as f:
        for line in lines:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")

    print(f"Generated {len(lines)} training examples")
    print(f"  - Original records: {len(records)}")
    print(f"  - Misclassified (duplicated): {len(misclassified_ids)}")
    print(f"  - Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
