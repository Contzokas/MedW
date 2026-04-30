# /// script
# dependencies = [
#   "pyarrow",
# ]
# ///
"""Convert artifact datasets into RAG corpus markdown files.

Reads:
  - artifacts/symptom_combinations/parquet-files/batch_00000.parquet
  - artifacts/preview_results_20260427_141936/dataset.parquet

Writes:
  - backend/data/corpus/symptom_examples.md
  - backend/data/corpus/triage_reference_cases.md
"""
from pathlib import Path
import glob
import os

import pyarrow.parquet as pq

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
CORPUS_DIR = PROJECT_ROOT / "backend" / "data" / "corpus"

MTS_LABELS = {1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-urgent"}
URGENCY_TO_MTS = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}

BODY_REGION_SPECIALTY = {
    "Head": "Neurology",
    "Chest": "Cardiology",
    "Abdomen": "Gastroenterology",
    "Upper Limbs": "Orthopedics",
    "Lower Limbs": "Orthopedics",
    "Back": "Orthopedics",
    "Skin": "Dermatology",
    "General": "General Practice",
}

DISCARD_IDS = {3, 32}

MAX_CHUNK_CHARS = 800


def _flatten(text: str) -> str:
    """Collapse internal newlines so the record becomes one paragraph block."""
    return " ".join(text.split())

def get_latest_parquet_path(prefix: str) -> Path:
    """Find the most recently generated data-designer dataset matching the prefix."""
    dirs = glob.glob(str(ARTIFACTS_DIR / f"{prefix}*"))
    if not dirs:
        raise FileNotFoundError(f"No artifact directories found starting with '{prefix}'")
    latest_dir = max(dirs, key=os.path.getmtime)
    
    parquet_path = Path(latest_dir) / "parquet-files"
    if parquet_path.exists():
        files = list(parquet_path.glob("*.parquet"))
        if files:
            return files[0]
            
    # Fallback to direct parquet file if Data Designer output format changes
    files = list(Path(latest_dir).glob("*.parquet"))
    if files:
        return files[0]
        
    raise FileNotFoundError(f"No parquet files found in {latest_dir}")

def build_symptom_examples() -> str:
    path = get_latest_parquet_path("symptom_combinations")
    print(f"Reading symptom_combinations from: {path}")
    table = pq.read_table(str(path))
    df = table.to_pandas()

    chunks = []
    discarded = 0
    for idx, row in df.iterrows():
        if idx in DISCARD_IDS:
            discarded += 1
            continue

        profile = row["symptom_profile"]
        if not isinstance(profile, dict):
            discarded += 1
            continue

        urgency = profile.get("recommended_urgency", "")
        mts_level = URGENCY_TO_MTS.get(urgency, 3)
        mts_label = MTS_LABELS.get(mts_level, "Urgent")
        specialty = BODY_REGION_SPECIALTY.get(row["body_region"], "General Practice")
        additional = profile.get("additional_symptoms", [])
        if hasattr(additional, "tolist"):
            additional = additional.tolist()
        additional_str = ", ".join(str(s) for s in additional[:4])

        desc = _flatten(str(row["description"]))
        primary = _flatten(str(profile.get("primary_symptom", "")))

        queries_str = ""
        if "query_variations" in df.columns and isinstance(row["query_variations"], dict):
            variations = row["query_variations"].get("variations", [])
            if hasattr(variations, "tolist"):
                variations = variations.tolist()
            if variations:
                queries_str = " Query Variations: " + ", ".join(f'"{v}"' for v in variations) + "."

        chunk = (
            f"Patient: {int(row['patient_age'])}-year-old {row['patient_sex']}. "
            f"Region: {row['body_region']}. "
            f"Duration: {row['duration_category']}. "
            f"Pain: {int(row['pain_level'])}/10. "
            f"{desc} "
            f"Primary symptom: {primary}. "
            f"Additional symptoms: {additional_str}. "
            f"MTS Level: {mts_level} ({mts_label}). Specialty: {specialty}.{queries_str}"
        )

        if len(chunk) > MAX_CHUNK_CHARS:
            max_desc = MAX_CHUNK_CHARS - len(chunk) + len(desc) - 3
            desc = desc[:max_desc] + "..."
            chunk = (
                f"Patient: {int(row['patient_age'])}-year-old {row['patient_sex']}. "
                f"Region: {row['body_region']}. "
                f"Duration: {row['duration_category']}. "
                f"Pain: {int(row['pain_level'])}/10. "
                f"{desc} "
                f"Primary symptom: {primary}. "
                f"Additional symptoms: {additional_str}. "
                f"MTS Level: {mts_level} ({mts_label}). Specialty: {specialty}.{queries_str}"
            )

        chunks.append(chunk)

    print(f"symptom_examples: {len(chunks)} chunks generated, {discarded} discarded")
    return "\n\n".join(chunks)


def build_triage_reference_cases() -> str:
    path = get_latest_parquet_path("triage_reference_cases")
    print(f"Reading triage_reference_cases from: {path}")
    table = pq.read_table(str(path))
    df = table.to_pandas()

    chunks = []
    discarded = 0
    for idx, row in df.iterrows():
        if "triage_accuracy_eval" in df.columns and isinstance(row["triage_accuracy_eval"], dict):
            score_data = row["triage_accuracy_eval"].get("clinical_accuracy", {})
            score = score_data.get("score", 1)
            if score < 1:
                discarded += 1
                continue

        level = int(row["expected_triage_level"])
        label = MTS_LABELS.get(level, "Urgent")
        category = row["symptom_category"]
        demo = row["patient_demographics"]
        presentation = _flatten(str(row["patient_presentation"]))
        rationale = _flatten(str(row["expected_rationale"]))

        # Vignette chunk — truncate presentation if needed
        vig_prefix = f"Triage Reference: {category}, {demo}. "
        vig_suffix = f" MTS Level: {level} ({label})."
        max_presentation = MAX_CHUNK_CHARS - len(vig_prefix) - len(vig_suffix) - 3
        if len(presentation) > max_presentation:
            presentation = presentation[:max_presentation] + "..."

        vignette = vig_prefix + presentation + vig_suffix
        chunks.append(vignette)

        # Rationale chunk — truncate if needed
        rat_prefix = f"MTS Rationale: {category}, Level {level}. "
        max_rationale = MAX_CHUNK_CHARS - len(rat_prefix) - 3
        if len(rationale) > max_rationale:
            rationale = rationale[:max_rationale] + "..."

        rationale_chunk = rat_prefix + rationale
        chunks.append(rationale_chunk)

    print(f"triage_reference_cases: {len(chunks)} chunks generated from {len(df)} records, {discarded} discarded due to QA filter")
    return "\n\n".join(chunks)


def validate(content: str, name: str):
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    lengths = [len(p) for p in paragraphs]
    over_limit = [l for l in lengths if l > MAX_CHUNK_CHARS]
    print(f"  {name}: {len(paragraphs)} chunks, "
          f"min={min(lengths)} max={max(lengths)} avg={sum(lengths)//len(lengths)} chars")
    if over_limit:
        print(f"  WARNING: {len(over_limit)} chunks exceed {MAX_CHUNK_CHARS} chars!")


def main():
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)

    symptom_content = build_symptom_examples()
    (CORPUS_DIR / "symptom_examples.md").write_text(symptom_content, encoding="utf-8")
    validate(symptom_content, "symptom_examples.md")

    triage_content = build_triage_reference_cases()
    (CORPUS_DIR / "triage_reference_cases.md").write_text(triage_content, encoding="utf-8")
    validate(triage_content, "triage_reference_cases.md")

    print("Done. Corpus files written to:", CORPUS_DIR)


if __name__ == "__main__":
    main()
