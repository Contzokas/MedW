# /// script
# dependencies = [
#   "requests",
#   "pyarrow",
# ]
# ///
import json
import time
from pathlib import Path

import pyarrow.parquet as pq
import requests

API_URL = "http://localhost:8000/api/v1/triage"
PARQUET_PATH = Path(__file__).parent / "artifacts" / "symptom_combinations" / "parquet-files" / "batch_00000.parquet"
OUTPUT_PATH = Path(__file__).parent / "artifacts" / "symptom_combinations" / "test_results.json"

URGENCY_TO_MTS = {
    "Critical": 1,
    "High": 2,
    "Medium": 3,
    "Low": 4,
    # 5 = Non-urgent, not in dataset
}


def load_dataset():
    table = pq.read_table(str(PARQUET_PATH))
    df = table.to_pandas()
    records = []
    for _, row in df.iterrows():
        profile = row["symptom_profile"]
        records.append({
            "body_region": row["body_region"],
            "severity": row["severity"],
            "pain_level": int(row["pain_level"]),
            "duration_category": row["duration_category"],
            "description": row["description"],
            "primary_symptom": profile["primary_symptom"],
            "additional_symptoms": profile["additional_symptoms"],
            "recommended_urgency": profile["recommended_urgency"],
        })
    return records


def classify_one(description: str, patient_id: str) -> dict:
    resp = requests.post(API_URL, json={"symptoms": description, "patient_id": patient_id}, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main():
    records = load_dataset()
    results = []

    for i, rec in enumerate(records):
        patient_id = f"test-{i:03d}"
        expected_mts = URGENCY_TO_MTS.get(rec["recommended_urgency"])

        try:
            triage = classify_one(rec["description"], patient_id)
            predicted_mts = triage.get("mts_level")
            results.append({
                "id": i,
                "description": rec["description"],
                "primary_symptom": rec["primary_symptom"],
                "additional_symptoms": list(rec["additional_symptoms"]),
                "body_region": rec["body_region"],
                "severity": rec["severity"],
                "pain_level": rec["pain_level"],
                "recommended_urgency": rec["recommended_urgency"],
                "expected_mts": expected_mts,
                "predicted_mts": predicted_mts,
                "predicted_label": triage.get("mts_label"),
                "specialty": triage.get("specialty"),
                "reasoning": triage.get("reasoning"),
                "rag_used": triage.get("rag_used"),
                "match": predicted_mts == expected_mts,
                "off_by": abs(predicted_mts - expected_mts) if predicted_mts and expected_mts else None,
            })
            status = "OK" if results[-1]["match"] else "MISMATCH"
            print(f"[{i+1:02d}/50] {status} | expected={expected_mts} predicted={predicted_mts} | {rec['body_region']} | {rec['severity']}")
        except Exception as exc:
            results.append({
                "id": i,
                "description": rec["description"],
                "primary_symptom": rec["primary_symptom"],
                "additional_symptoms": list(rec["additional_symptoms"]),
                "body_region": rec["body_region"],
                "severity": rec["severity"],
                "expected_mts": expected_mts,
                "predicted_mts": None,
                "error": str(exc),
                "match": False,
            })
            print(f"[{i+1:02d}/50] ERROR: {exc}")

        if i < len(records) - 1:
            time.sleep(0.5)  # rate limit

    # Summary
    matches = sum(1 for r in results if r["match"])
    off_by_1 = sum(1 for r in results if r.get("off_by") == 1)
    off_by_2_plus = sum(1 for r in results if r.get("off_by", 0) >= 2)
    total = len(results)

    print(f"\n{'='*60}")
    print(f"BASELINE RESULTS: {matches}/{total} exact matches ({matches/total*100:.1f}%)")
    print(f"Off by 1 level: {off_by_1}")
    print(f"Off by 2+ levels: {off_by_2_plus}")
    print(f"Errors: {total - matches - off_by_1 - off_by_2_plus}")

    # Per-level breakdown
    print(f"\nPer MTS level breakdown:")
    for level in [1, 2, 3, 4, 5]:
        subset = [r for r in results if r["expected_mts"] == level]
        if subset:
            level_matches = sum(1 for r in subset if r["match"])
            print(f"  MTS {level}: {level_matches}/{len(subset)} correct")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
