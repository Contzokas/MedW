"""
MedW Pipeline Latency Benchmark  (Ollama / ChromaDB stack)
===========================================================
Measures end-to-end and per-stage latency for the triage pipeline.

Usage:
    python scripts/benchmark_latency.py
    python scripts/benchmark_latency.py --url http://localhost:8000 --runs 3
    python scripts/benchmark_latency.py --url http://<host>:<port> --runs 5 --csv

Requirements: pip install requests

Modes
-----
  Debug mode  (RAG_DEBUG_ENABLED=true on backend):
    Per-stage ms: chroma_rag | ollama_llm | parse
    Wall-clock total

  Fallback mode (RAG_DEBUG_ENABLED=false):
    Client-side wall-clock timing only via /api/v1/triage
"""

import argparse
import csv
import statistics
import sys
import time
import uuid
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed.  Run:  pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    # (label, symptoms, lang, expected_mts_hint)
    ("L1 cardiac arrest",  "O asthenis ekhase tis aisthiseis, den anapnei, den ekhei sfygmo", "el", 1),
    ("L1 chest pain",      "Chest pain radiating to left arm, sweating, shortness of breath", "en", 1),
    ("L2 stroke signs",    "Sudden severe headache, facial droop, arm weakness, slurred speech", "en", 2),
    ("L2 severe bleeding", "Entoni aimorragia apo trauma sto kheri, den stamata", "el", 2),
    ("L3 abdominal pain",  "Moderate abdominal pain for 2 hours, nausea, no fever", "en", 3),
    ("L3 high fever",      "Pyretos 39.5 vathmoi gia 2 meres, ponokephalos, myalgies", "el", 3),
    ("L4 sore throat",     "Sore throat for 3 days, mild fever 37.8, no difficulty swallowing", "en", 4),
    ("L4 knee pain",       "Ipios ponos sto gonato meta apo ptosi, khoris praksimo", "el", 4),
    ("L5 mild rash",       "Small itchy rash on forearm for one week, no fever, no spreading", "en", 5),
    ("L5 routine",         "Thelo na kano genikes etaseis aimatos, aisthanomai kala", "el", 5),
    ("vague (pre-filter)", "geia", "el", None),
    ("vague (pre-filter)", "hi",   "en", None),
]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _post(url, path, payload, timeout):
    t0 = time.perf_counter()
    r = requests.post(f"{url.rstrip('/')}{path}", json=payload, timeout=timeout)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    r.raise_for_status()
    return r.json(), elapsed_ms


def check_debug_available(base_url):
    try:
        r = requests.get(f"{base_url.rstrip('/')}/api/v1/rag/debug/status", timeout=10)
        return r.status_code == 200 and r.json().get("rag_debug_enabled", False)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Per-run measurement
# ---------------------------------------------------------------------------

def run_debug_pipeline(base_url, symptoms, lang, timeout):
    payload = {"symptoms": symptoms, "lang": lang}
    body, wall_ms = _post(base_url, "/api/v1/rag/debug/pipeline", payload, timeout)

    rag  = body.get("stages", {}).get("rag_retrieval", {})
    llm  = body.get("stages", {}).get("llm_invocation", {})
    prse = body.get("stages", {}).get("response_parse", {})

    return {
        "wall_ms":          wall_ms,
        "rag_ms":           rag.get("duration_ms"),
        "llm_ms":           llm.get("duration_ms"),
        "parse_ms":         prse.get("duration_ms"),
        "response_length":  llm.get("response_length"),
        "model_used":       llm.get("model_used"),
        "chunks_retrieved": rag.get("chunks_retrieved"),
        "context_length":   rag.get("context_length"),
        "pre_filtered":     wall_ms < 50 and not rag.get("chunks_retrieved"),
        "error":            body.get("error"),
        "mode":             "debug",
    }


def run_triage(base_url, symptoms, lang, timeout):
    payload = {
        "symptoms":   symptoms,
        "lang":       lang,
        "patient_id": str(uuid.uuid4()),
    }
    body, wall_ms = _post(base_url, "/api/v1/triage", payload, timeout)
    pre_filtered = wall_ms < 50 and "mts_level" not in body
    return {
        "wall_ms": wall_ms,
        "rag_ms": None, "llm_ms": None, "parse_ms": None,
        "response_length": None, "model_used": None,
        "chunks_retrieved": None, "context_length": None,
        "pre_filtered": pre_filtered,
        "error": None, "mode": "triage",
    }


# ---------------------------------------------------------------------------
# Stats helpers
# ---------------------------------------------------------------------------

def _vals(results, key):
    return [r[key] for r in results if r.get(key) is not None]


def _stats(values):
    if not values:
        return None
    s = sorted(values)
    p95_idx = max(0, int(len(s) * 0.95) - 1)
    return {
        "mean": statistics.mean(s),
        "p50":  statistics.median(s),
        "p95":  s[p95_idx],
        "min":  s[0],
        "max":  s[-1],
        "n":    len(s),
    }


def _fmt_ms(v):
    if v is None:
        return "     n/a"
    if v < 10:
        return f"{v:7.1f}"
    return f"{v:7,.0f}"


def _bar(v, max_v, width=24):
    if not v or not max_v:
        return " " * width
    filled = int((v / max_v) * width)
    return "#" * min(filled, width) + "-" * max(0, width - filled)


def _section(title):
    print(f"\n{'='*64}")
    print(f"  {title}")
    print(f"{'='*64}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MedW pipeline latency benchmark (Ollama)")
    parser.add_argument("--url",     default="http://localhost:8000")
    parser.add_argument("--runs",    type=int, default=2)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--csv",     action="store_true")
    parser.add_argument("--cases",   type=int, default=None,
                        help="Limit to first N test cases")
    args = parser.parse_args()

    print(f"\n{'='*64}")
    print(f"  MedW Pipeline Latency Benchmark  [Ollama / ChromaDB]")
    print(f"{'='*64}")
    print(f"  Backend : {args.url}")
    print(f"  Runs    : {args.runs} per case")
    print(f"  Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print("\n[1/3] Checking backend...")
    try:
        r = requests.get(f"{args.url.rstrip('/')}/api/v1/health", timeout=10)
        print(f"  Health  : HTTP {r.status_code}")
    except Exception as exc:
        print(f"  ERROR: Cannot reach {args.url}: {exc}")
        sys.exit(1)

    debug_available = check_debug_available(args.url)
    if debug_available:
        print("  Mode    : debug pipeline  (RAG + LLM stage breakdown)")
    else:
        print("  Mode    : triage only  (set RAG_DEBUG_ENABLED=true for stage breakdown)")

    cases = TEST_CASES[:args.cases] if args.cases else TEST_CASES
    print(f"\n[2/3] Running {len(cases)} cases x {args.runs} runs...")

    all_results = []
    by_case: dict[str, list[dict]] = {}
    detected_model = None

    for label, symptoms, lang, _ in cases:
        runs = []
        for i in range(args.runs):
            tag = f"  [{label[:36]:<36}] {i+1}/{args.runs}"
            sys.stdout.write(f"{tag}  "); sys.stdout.flush()
            try:
                if debug_available:
                    r = run_debug_pipeline(args.url, symptoms, lang, args.timeout)
                else:
                    r = run_triage(args.url, symptoms, lang, args.timeout)
                r["label"] = label
                r["lang"]  = lang
                runs.append(r)
                all_results.append(r)

                if r.get("model_used") and not detected_model:
                    detected_model = r["model_used"]

                if r["pre_filtered"]:
                    print(f"{r['wall_ms']:6.0f} ms  <- pre-filter")
                elif debug_available and r.get("llm_ms"):
                    print(f"{r['wall_ms']:7,.0f} ms  "
                          f"(rag:{_fmt_ms(r.get('rag_ms')).strip()}ms"
                          f" llm:{_fmt_ms(r.get('llm_ms')).strip()}ms)")
                else:
                    print(f"{r['wall_ms']:7,.0f} ms")
            except requests.exceptions.Timeout:
                print(f"TIMEOUT after {args.timeout}s")
            except Exception as exc:
                print(f"ERROR: {exc}")
        by_case[label] = runs

    if not all_results:
        print("\nNo results collected.")
        sys.exit(1)

    llm_results  = [r for r in all_results if not r.get("pre_filtered") and r.get("llm_ms")]
    pre_filtered = [r for r in all_results if r.get("pre_filtered")]
    model_label  = detected_model or "Ollama LLM"

    print("\n[3/3] Results")

    # -- Stage breakdown ------------------------------------------------------
    _section(f"STAGE BREAKDOWN  (n={len(llm_results)})")
    if debug_available and llm_results:
        stages = [
            ("ChromaDB RAG",   _stats(_vals(llm_results, "rag_ms"))),
            (model_label,      _stats(_vals(llm_results, "llm_ms"))),
            ("Response parse", _stats(_vals(llm_results, "parse_ms"))),
        ]
        wall_s = _stats(_vals(all_results, "wall_ms"))

        hdr = f"  {'Stage':<28}  {'Mean':>8}  {'P50':>8}  {'P95':>8}  {'Min':>8}  {'Max':>8}"
        sep = "  " + "-" * (len(hdr) - 2)
        print(hdr); print(sep)
        for name, s in stages:
            if s:
                print(f"  {name:<28}  {_fmt_ms(s['mean'])}ms  {_fmt_ms(s['p50'])}ms"
                      f"  {_fmt_ms(s['p95'])}ms  {_fmt_ms(s['min'])}ms  {_fmt_ms(s['max'])}ms")
        print(sep)
        if wall_s:
            print(f"  {'END-TO-END (wall clock)':<28}  {_fmt_ms(wall_s['mean'])}ms  "
                  f"{_fmt_ms(wall_s['p50'])}ms  {_fmt_ms(wall_s['p95'])}ms  "
                  f"{_fmt_ms(wall_s['min'])}ms  {_fmt_ms(wall_s['max'])}ms")

        rag_mean  = statistics.mean(_vals(llm_results, "rag_ms")) if _vals(llm_results, "rag_ms") else 0
        llm_mean  = statistics.mean(_vals(llm_results, "llm_ms"))
        wall_mean = statistics.mean(_vals(all_results, "wall_ms"))
        if wall_mean:
            print(f"\n  LLM share : {llm_mean/wall_mean*100:.1f}%  "
                  f"| RAG share : {rag_mean/wall_mean*100:.1f}%  "
                  f"| Other : {(wall_mean-llm_mean-rag_mean)/wall_mean*100:.1f}%")
    else:
        wall_s = _stats(_vals(all_results, "wall_ms"))
        if wall_s:
            print(f"  End-to-end  mean={_fmt_ms(wall_s['mean']).strip()}ms  "
                  f"p50={_fmt_ms(wall_s['p50']).strip()}ms  "
                  f"p95={_fmt_ms(wall_s['p95']).strip()}ms")

    # -- Pre-filter stats -----------------------------------------------------
    if pre_filtered:
        pf_s = _stats([r["wall_ms"] for r in pre_filtered])
        _section("PRE-FILTER (deterministic bypass)")
        print(f"  {len(pre_filtered)} request(s) bypassed LLM entirely")
        if pf_s:
            print(f"  Wall time  mean={pf_s['mean']:.1f}ms  max={pf_s['max']:.1f}ms")
        if llm_results:
            print(f"  Saving ~{statistics.mean(_vals(llm_results, 'llm_ms'))/1000:.0f}s LLM call per vague input")

    # -- Per-case wall times --------------------------------------------------
    _section("PER-CASE WALL TIME")
    max_wall = max((statistics.mean(r["wall_ms"] for r in runs)
                    for runs in by_case.values()
                    if any(not r.get("pre_filtered") for r in runs)), default=1)
    for label, runs in by_case.items():
        if not runs:
            print(f"  {label:<42}  no data"); continue
        pf = all(r.get("pre_filtered") for r in runs)
        avg = statistics.mean(r["wall_ms"] for r in runs)
        if pf:
            print(f"  {label:<42}  {avg:6.0f} ms  <- pre-filter bypass")
        else:
            print(f"  {label:<42}  {avg:7,.0f} ms  {_bar(avg, max_wall)}")

    # -- CSV export -----------------------------------------------------------
    if args.csv:
        fname = f"benchmark_ollama_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        fields = ["label", "lang", "wall_ms", "rag_ms", "llm_ms", "parse_ms",
                  "response_length", "model_used", "chunks_retrieved", "context_length",
                  "pre_filtered", "error", "mode"]
        with open(fname, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(all_results)
        print(f"\n  Saved -> {fname}")

    print(f"\n{'='*64}\n")


if __name__ == "__main__":
    main()
