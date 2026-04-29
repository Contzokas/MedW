"""
MedW Pipeline Latency Benchmark
================================
Measures per-stage latency across the full triage pipeline.

Usage:
    python scripts/benchmark_latency.py
    python scripts/benchmark_latency.py --url http://localhost:8000 --runs 3
    python scripts/benchmark_latency.py --url http://<runai-ip>:<port> --runs 5 --csv

Requirements: pip install requests  (or: python -m pip install requests)

How it works:
  1. Tries POST /api/rag/debug/pipeline  — returns per-stage ms breakdown
     (requires RAG_DEBUG_ENABLED=true on the backend)
  2. If debug is disabled (403), falls back to POST /api/triage with
     client-side total timing only
  Both modes also measure end-to-end wall time on the client side.
"""

import argparse
import csv
import json
import statistics
import sys
import time
import uuid
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run:  pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Test cases — diverse symptom inputs covering all MTS levels + edge cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    # (label, symptoms, lang, expected_mts_hint)
    ("L1 cardiac arrest",  "Ο ασθενής έχασε τις αισθήσεις, δεν αναπνέει, δεν έχει σφυγμό", "el", 1),
    ("L1 chest pain",      "Chest pain radiating to left arm, sweating, shortness of breath", "en", 1),
    ("L2 stroke signs",    "Sudden severe headache, facial droop, arm weakness, slurred speech", "en", 2),
    ("L2 severe bleeding", "Έντονη αιμορραγία από τραύμα στο χέρι, δεν σταματά", "el", 2),
    ("L3 abdominal pain",  "Moderate abdominal pain for 2 hours, nausea, no fever", "en", 3),
    ("L3 high fever",      "Πυρετός 39.5°C για 2 μέρες, πονοκέφαλος, μυαλγίες", "el", 3),
    ("L4 sore throat",     "Sore throat for 3 days, mild fever 37.8, no difficulty swallowing", "en", 4),
    ("L4 knee pain",       "Ήπιος πόνος στο γόνατο μετά από πτώση, χωρίς πρήξιμο", "el", 4),
    ("L5 mild rash",       "Small itchy rash on forearm for one week, no fever, no spreading", "en", 5),
    ("L5 routine",         "Θέλω να κάνω γενικές εξετάσεις αίματος, αισθάνομαι καλά", "el", 5),
    ("vague (pre-filter)", "γεια", "el", None),
    ("vague (pre-filter)", "hi", "en", None),
]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _post(url: str, path: str, payload: dict, timeout: int) -> tuple[dict, float]:
    """POST to url+path, return (json_body, elapsed_ms). Raises on error."""
    t0 = time.perf_counter()
    r = requests.post(f"{url.rstrip('/')}{path}", json=payload, timeout=timeout)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    r.raise_for_status()
    return r.json(), elapsed_ms


def check_debug_available(base_url: str) -> bool:
    try:
        r = requests.get(f"{base_url.rstrip('/')}/api/rag/debug/status", timeout=10)
        return r.status_code == 200 and r.json().get("rag_debug_enabled", False)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Single-run measurement
# ---------------------------------------------------------------------------

def run_debug_pipeline(base_url: str, symptoms: str, lang: str, timeout: int) -> dict:
    """Use /api/rag/debug/pipeline — returns per-stage breakdown."""
    payload = {"symptoms": symptoms, "lang": lang}
    body, wall_ms = _post(base_url, "/api/rag/debug/pipeline", payload, timeout)

    stages = body.get("stages", {})
    rag = stages.get("rag_retrieval", {})
    llm = stages.get("llm_invocation", {})
    parse = stages.get("response_parse", {})

    # rag_retrieval.duration_ms covers embed + milvus + rerank together.
    # The retrieve debug trace has per-span data; extract if present.
    rag_spans = {}
    rag_trace_chunks = rag.get("chunks", [])
    # spans not in full_pipeline response — use rag total
    rag_ms = rag.get("duration_ms", 0.0)
    llm_ms = llm.get("duration_ms", 0.0)
    parse_ms = parse.get("duration_ms", 0.0)

    return {
        "wall_ms": wall_ms,
        "total_debug_ms": body.get("total_duration_ms", 0.0),
        "rag_ms": rag_ms,
        "llm_ms": llm_ms,
        "parse_ms": parse_ms,
        "rag_chunks": len(rag_trace_chunks),
        "error": body.get("error"),
        "mode": "debug",
    }


def run_triage(base_url: str, symptoms: str, lang: str, timeout: int) -> dict:
    """Use /api/triage — client-side timing only."""
    payload = {
        "symptoms": symptoms,
        "lang": lang,
        "patient_id": str(uuid.uuid4()),
        "allow_follow_up": False,
    }
    body, wall_ms = _post(base_url, "/api/triage", payload, timeout)
    mts = body.get("mts_level", body.get("follow_up_question") and "followup" or "redirect")
    return {
        "wall_ms": wall_ms,
        "total_debug_ms": None,
        "rag_ms": None,
        "llm_ms": None,
        "parse_ms": None,
        "rag_chunks": None,
        "mts_level": mts,
        "error": None,
        "mode": "triage",
    }


# ---------------------------------------------------------------------------
# Stats helpers
# ---------------------------------------------------------------------------

def _stats(values: list[float]) -> dict:
    if not values:
        return {"mean": None, "p50": None, "p95": None, "min": None, "max": None}
    s = sorted(values)
    p95_idx = max(0, int(len(s) * 0.95) - 1)
    return {
        "mean": statistics.mean(s),
        "p50": statistics.median(s),
        "p95": s[p95_idx],
        "min": s[0],
        "max": s[-1],
    }


def _fmt(v) -> str:
    if v is None:
        return "  n/a  "
    if v < 10:
        return f"{v:6.1f}"
    return f"{v:6.0f}"


def _bar(v, max_v, width=20) -> str:
    if v is None or max_v == 0:
        return " " * width
    filled = int((v / max_v) * width)
    return "█" * filled + "░" * (width - filled)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MedW pipeline latency benchmark")
    parser.add_argument("--url", default="http://localhost:8000",
                        help="Backend base URL (default: http://localhost:8000)")
    parser.add_argument("--runs", type=int, default=2,
                        help="Runs per test case (default: 2)")
    parser.add_argument("--timeout", type=int, default=180,
                        help="HTTP timeout in seconds (default: 180)")
    parser.add_argument("--csv", action="store_true",
                        help="Write results to benchmark_results.csv")
    parser.add_argument("--cases", type=int, default=None,
                        help="Limit to first N test cases (default: all)")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  MedW Pipeline Latency Benchmark")
    print(f"{'='*60}")
    print(f"  Backend : {args.url}")
    print(f"  Runs    : {args.runs} per case")
    print(f"  Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Check connectivity
    print(f"\n[1/3] Checking backend connectivity...")
    try:
        r = requests.get(f"{args.url.rstrip('/')}/health", timeout=10)
        print(f"  Health  : {r.status_code}")
    except Exception as exc:
        print(f"  ERROR: Cannot reach backend at {args.url}: {exc}")
        print("  Is the server running? Try: docker-compose up  or  uvicorn main:app")
        sys.exit(1)

    debug_available = check_debug_available(args.url)
    mode = "debug pipeline" if debug_available else "triage (client-side timing only)"
    print(f"  Mode    : {mode}")
    if not debug_available:
        print("  NOTE: Set RAG_DEBUG_ENABLED=true on the backend for per-stage breakdown.")

    cases = TEST_CASES[:args.cases] if args.cases else TEST_CASES
    print(f"\n[2/3] Running {len(cases)} test cases × {args.runs} runs...")

    all_results = []
    by_case: dict[str, list[dict]] = {}

    for label, symptoms, lang, expected_mts in cases:
        runs = []
        for run_i in range(args.runs):
            tag = f"  [{label}] run {run_i+1}/{args.runs}"
            sys.stdout.write(f"{tag:<55} ... ")
            sys.stdout.flush()
            try:
                if debug_available:
                    result = run_debug_pipeline(args.url, symptoms, lang, args.timeout)
                else:
                    result = run_triage(args.url, symptoms, lang, args.timeout)
                result.update({"label": label, "lang": lang, "expected_mts": expected_mts})
                runs.append(result)
                all_results.append(result)
                if result["wall_ms"] < 50:
                    print(f"{result['wall_ms']:5.0f} ms  ← pre-filtered")
                else:
                    print(f"{result['wall_ms']:6,.0f} ms")
            except requests.exceptions.Timeout:
                print(f"TIMEOUT after {args.timeout}s")
            except Exception as exc:
                print(f"ERROR: {exc}")

        by_case[label] = runs

    if not all_results:
        print("\nNo results collected.")
        sys.exit(1)

    # ------------------------------------------------------------------
    # Summary table
    # ------------------------------------------------------------------
    print(f"\n[3/3] Results\n")

    wall_times = [r["wall_ms"] for r in all_results]
    rag_times  = [r["rag_ms"]  for r in all_results if r["rag_ms"]  is not None]
    llm_times  = [r["llm_ms"]  for r in all_results if r["llm_ms"]  is not None]
    parse_times= [r["parse_ms"]for r in all_results if r["parse_ms"] is not None]

    ws = _stats(wall_times)
    rs = _stats(rag_times)
    ls = _stats(llm_times)
    ps = _stats(parse_times)

    col = 28
    hdr = f"{'Stage':<{col}}  {'Mean':>8}  {'P50':>8}  {'P95':>8}  {'Min':>8}  {'Max':>8}"
    sep = "-" * len(hdr)
    print(hdr)
    print(sep)

    def row(name, s):
        if s["mean"] is None:
            return f"  {name:<{col-2}}  {'n/a':>8}"
        return (f"  {name:<{col-2}}  {s['mean']:>7.0f}ms"
                f"  {s['p50']:>7.0f}ms"
                f"  {s['p95']:>7.0f}ms"
                f"  {s['min']:>7.0f}ms"
                f"  {s['max']:>7.0f}ms")

    if debug_available:
        print(row("RAG (embed+search+rerank)", rs))
        print(row("LLM (Nemotron 120B)", ls))
        print(row("Parse + queue write", ps))
        print(sep)
    print(row("END-TO-END (wall clock)", ws))
    print()

    # Per-case breakdown
    print(f"{'Per-case average wall time':}")
    print(sep)
    max_wall = max((statistics.mean([r["wall_ms"] for r in runs]) for runs in by_case.values() if runs), default=1)
    for label, runs in by_case.items():
        if not runs:
            print(f"  {label:<40}  no data")
            continue
        avg = statistics.mean(r["wall_ms"] for r in runs)
        bar = _bar(avg, max_wall)
        if avg < 50:
            print(f"  {label:<40}  {avg:6.0f} ms  {bar}  ← pre-filter bypass")
        else:
            print(f"  {label:<40}  {avg:6,.0f} ms  {bar}")

    print()
    if debug_available and llm_times:
        llm_pct = statistics.mean(llm_times) / statistics.mean(wall_times) * 100
        rag_pct = statistics.mean(rag_times) / statistics.mean(wall_times) * 100 if rag_times else 0
        print(f"  LLM is {llm_pct:.0f}% of total latency")
        print(f"  RAG is  {rag_pct:.0f}% of total latency")
        print()

    # ------------------------------------------------------------------
    # CSV export
    # ------------------------------------------------------------------
    if args.csv:
        fname = f"benchmark_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(fname, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "label", "lang", "expected_mts", "wall_ms",
                "rag_ms", "llm_ms", "parse_ms", "rag_chunks", "mode", "error"
            ])
            writer.writeheader()
            writer.writerows(all_results)
        print(f"  Saved to {fname}")

    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
