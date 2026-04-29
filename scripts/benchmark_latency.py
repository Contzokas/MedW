"""
MedW Pipeline Latency Benchmark
================================
Measures every measurable stage in the triage pipeline.

Usage:
    python scripts/benchmark_latency.py
    python scripts/benchmark_latency.py --url http://localhost:8000 --runs 3
    python scripts/benchmark_latency.py --url http://<runai-ip>:<port> --runs 5 --csv

Requirements: pip install requests

Modes
-----
  Debug mode  (RAG_DEBUG_ENABLED=true on backend):
    Per-stage ms: milvus_connect | embed | milvus_search | rerank | llm | parse
    Token counts: prompt_tokens, completion_tokens, tokens_per_sec
    RAG quality:  cosine similarity scores per retrieved chunk

  Fallback mode (RAG_DEBUG_ENABLED=false):
    Client-side wall-clock timing only via /api/triage
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
        r = requests.get(f"{base_url.rstrip('/')}/api/rag/debug/status", timeout=10)
        return r.status_code == 200 and r.json().get("rag_debug_enabled", False)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Per-run measurement
# ---------------------------------------------------------------------------

def run_debug_pipeline(base_url, symptoms, lang, timeout):
    payload = {"symptoms": symptoms, "lang": lang}
    body, wall_ms = _post(base_url, "/api/rag/debug/pipeline", payload, timeout)

    rag  = body.get("stages", {}).get("rag_retrieval", {})
    llm  = body.get("stages", {}).get("llm_invocation", {})
    prse = body.get("stages", {}).get("response_parse", {})
    spans = rag.get("spans") or {}
    return {
        "wall_ms":             wall_ms,
        "rag_ms":              rag.get("duration_ms"),
        "connect_ms":          spans.get("milvus_connect_ms"),
        "embed_ms":            spans.get("embed_query_ms"),
        "search_ms":           spans.get("milvus_search_ms"),
        "rerank_ms":           spans.get("rerank_ms"),
        "process_ms":          spans.get("process_results_ms"),
        "llm_ms":              llm.get("duration_ms"),
        "parse_ms":            prse.get("duration_ms"),
        "prompt_tokens":       llm.get("prompt_tokens"),
        "completion_tokens":   llm.get("completion_tokens"),
        "total_tokens":        llm.get("total_tokens"),
        "tokens_per_sec":      llm.get("tokens_per_sec"),
        "response_length":     llm.get("response_length"),
        "top_relevance":       rag.get("top_relevance"),
        "mean_relevance":      rag.get("mean_relevance"),
        "chunks_retrieved":    rag.get("chunks_retrieved"),
        "context_length":      rag.get("context_length"),
        "pre_filtered":        wall_ms < 50 and not rag.get("chunks_retrieved"),
        "error":               body.get("error"),
        "mode":                "debug",
    }


def run_triage(base_url, symptoms, lang, timeout):
    payload = {
        "symptoms":      symptoms,
        "lang":          lang,
        "patient_id":    str(uuid.uuid4()),
        "allow_follow_up": False,
    }
    body, wall_ms = _post(base_url, "/api/triage", payload, timeout)
    pre_filtered = wall_ms < 50 and "mts_level" not in body
    return {
        "wall_ms": wall_ms,
        "rag_ms": None, "connect_ms": None, "embed_ms": None,
        "search_ms": None, "rerank_ms": None, "process_ms": None,
        "llm_ms": None, "parse_ms": None,
        "prompt_tokens": None, "completion_tokens": None,
        "total_tokens": None, "tokens_per_sec": None,
        "response_length": None, "top_relevance": None,
        "mean_relevance": None, "chunks_retrieved": None,
        "context_length": None, "pre_filtered": pre_filtered,
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
    return "█" * min(filled, width) + "░" * max(0, width - filled)


def _section(title):
    print(f"\n{'━'*64}")
    print(f"  {title}")
    print(f"{'━'*64}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MedW pipeline latency benchmark")
    parser.add_argument("--url",     default="http://localhost:8000")
    parser.add_argument("--runs",    type=int, default=2)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--csv",     action="store_true")
    parser.add_argument("--cases",   type=int, default=None,
                        help="Limit to first N test cases")
    args = parser.parse_args()

    print(f"\n{'='*64}")
    print(f"  MedW Pipeline Latency Benchmark")
    print(f"{'='*64}")
    print(f"  Backend : {args.url}")
    print(f"  Runs    : {args.runs} per case")
    print(f"  Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print("\n[1/3] Checking backend...")
    try:
        r = requests.get(f"{args.url.rstrip('/')}/health", timeout=10)
        print(f"  Health  : HTTP {r.status_code}")
    except Exception as exc:
        print(f"  ERROR: Cannot reach {args.url}: {exc}")
        sys.exit(1)

    debug_available = check_debug_available(args.url)
    if debug_available:
        print("  Mode    : debug pipeline  (per-stage breakdown + token stats)")
    else:
        print("  Mode    : triage only  (set RAG_DEBUG_ENABLED=true for full breakdown)")

    cases = TEST_CASES[:args.cases] if args.cases else TEST_CASES
    print(f"\n[2/3] Running {len(cases)} cases × {args.runs} runs...")

    all_results = []
    by_case: dict[str, list[dict]] = {}

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

                if r["pre_filtered"]:
                    print(f"{r['wall_ms']:6.0f} ms  ← pre-filter")
                elif debug_available and r.get("llm_ms"):
                    tps = f" | {r['tokens_per_sec']:.0f} tok/s" if r.get("tokens_per_sec") else ""
                    ctok = f" | {r['completion_tokens']}tok" if r.get("completion_tokens") else ""
                    print(f"{r['wall_ms']:7,.0f} ms  "
                          f"(embed:{_fmt_ms(r.get('embed_ms')).strip()}ms"
                          f" srch:{_fmt_ms(r.get('search_ms')).strip()}ms"
                          f" rerank:{_fmt_ms(r.get('rerank_ms')).strip()}ms"
                          f" llm:{_fmt_ms(r.get('llm_ms')).strip()}ms"
                          f"{ctok}{tps})")
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
    rag_results  = [r for r in all_results if not r.get("pre_filtered") and r.get("rag_ms")]
    pre_filtered = [r for r in all_results if r.get("pre_filtered")]

    print("\n[3/3] Results")

    # ── Stage breakdown ───────────────────────────────────────────────────────
    _section(f"STAGE BREAKDOWN  (cache-miss runs, n={len(llm_results)})")
    if debug_available and llm_results:
        stages = [
            ("Milvus connect",        _stats(_vals(llm_results, "connect_ms"))),
            ("NIM Embed (query)",      _stats(_vals(llm_results, "embed_ms"))),
            ("Milvus search",          _stats(_vals(llm_results, "search_ms"))),
            ("NIM Reranker",           _stats(_vals(llm_results, "rerank_ms"))),
            ("NIM LLM (Nemotron 120B)",_stats(_vals(llm_results, "llm_ms"))),
            ("Response parse",         _stats(_vals(llm_results, "parse_ms"))),
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

        llm_mean  = statistics.mean(_vals(llm_results, "llm_ms"))
        rag_mean  = statistics.mean(_vals(rag_results, "rag_ms")) if rag_results else 0
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

    # ── Token stats ───────────────────────────────────────────────────────────
    tok_results = [r for r in llm_results if r.get("completion_tokens")]
    if tok_results:
        _section(f"TOKEN STATS  (Nemotron Super 120B, n={len(tok_results)})")
        for label, key in [
            ("Prompt tokens   ", "prompt_tokens"),
            ("Completion tokens", "completion_tokens"),
            ("Total tokens    ", "total_tokens"),
        ]:
            s = _stats(_vals(tok_results, key))
            if s:
                print(f"  {label}  mean={s['mean']:5.0f}  p50={s['p50']:5.0f}"
                      f"  min={s['min']:5.0f}  max={s['max']:5.0f}")
        tps_s = _stats(_vals(tok_results, "tokens_per_sec"))
        if tps_s:
            print(f"  Tokens / sec      mean={tps_s['mean']:5.1f}  p50={tps_s['p50']:5.1f}"
                  f"  min={tps_s['min']:5.1f}  max={tps_s['max']:5.1f}")

    # ── RAG quality ───────────────────────────────────────────────────────────
    rel_results = [r for r in llm_results if r.get("top_relevance") is not None]
    if rel_results:
        _section(f"RAG QUALITY  (cosine similarity, n={len(rel_results)})")
        for label, key in [
            ("Top chunk similarity ", "top_relevance"),
            ("Mean chunk similarity", "mean_relevance"),
        ]:
            s = _stats(_vals(rel_results, key))
            if s:
                print(f"  {label}  mean={s['mean']:.3f}  p50={s['p50']:.3f}"
                      f"  min={s['min']:.3f}  max={s['max']:.3f}")
        ctx_s = _stats(_vals(rel_results, "context_length"))
        if ctx_s:
            print(f"  Context chars assembled  mean={ctx_s['mean']:,.0f}  "
                  f"min={ctx_s['min']:,.0f}  max={ctx_s['max']:,.0f}")

    # ── Pre-filter stats ──────────────────────────────────────────────────────
    if pre_filtered:
        pf_s = _stats([r["wall_ms"] for r in pre_filtered])
        _section("PRE-FILTER (deterministic bypass)")
        print(f"  {len(pre_filtered)} request(s) bypassed LLM entirely")
        if pf_s:
            print(f"  Wall time  mean={pf_s['mean']:.1f}ms  max={pf_s['max']:.1f}ms")
        print(f"  Saving ~{statistics.mean(_vals(llm_results, 'llm_ms'))/1000:.0f}s LLM call per vague input"
              if llm_results else "")

    # ── Per-case wall times ───────────────────────────────────────────────────
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
            print(f"  {label:<42}  {avg:6.0f} ms  ← pre-filter bypass")
        else:
            print(f"  {label:<42}  {avg:7,.0f} ms  {_bar(avg, max_wall)}")

    # ── CSV export ────────────────────────────────────────────────────────────
    if args.csv:
        fname = f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        fields = ["label", "lang", "wall_ms", "connect_ms", "embed_ms", "search_ms",
                  "rerank_ms", "llm_ms", "parse_ms", "prompt_tokens", "completion_tokens",
                  "total_tokens", "tokens_per_sec", "response_length", "top_relevance",
                  "mean_relevance", "chunks_retrieved", "context_length",
                  "pre_filtered", "error", "mode"]
        with open(fname, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(all_results)
        print(f"\n  Saved → {fname}")

    print(f"\n{'='*64}\n")


if __name__ == "__main__":
    main()
