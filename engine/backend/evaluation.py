"""Reliability evaluation for the deterministic agents.

    python evaluation.py --suite lidar_50 --twins medplum,twilio
    python evaluation.py --suite lidar_500 --seed 7 --out ../docs/eval-baseline.json

What is measured (no API keys, no network):
  geometry     N simulated RoomPlan exports with known ground truth -> does the
               Geometry agent flag exactly the doors the 28 in walker cannot use,
               classify >60 in spans as spans, convert m->in correctly?
  escalations  does the Arbitration agent route a failing door to OT + MD, a
               critical hazard to the discharge coordinator, uncovered DME to
               social work, and keep clinical > operational > social > routine?
  fhir         is every draft Bundle well-formed FHIR R4 (types, status=draft,
               intent=proposal, DRAFT tag, HCPCS from the catalog, no E0143 for
               a walker the patient already owns)?
  twins        stateful in-process twins for Medplum (POST Bundle) and Twilio
               (Messages.create) that enforce the request contract each service
               expects and record every call. Nothing leaves the machine.

The Claude-backed passes (vision fast/deep pass, obligation scoring) are not
part of this suite; they are exercised by replaying a real walkthrough with
prepare_demo.py / demo.py.
"""

import argparse
import json
import random
import re
import sys
import threading
import time
from collections import deque

from config import EVENTS_KEEP, WALKER_WIDTH_IN
from escalations import build_escalations
from fhir_writeback import DME_CATALOG, draft_bundle
from geometry import M_TO_IN, ingest_roomplan
from state import Run

CLEAR_IN = WALKER_WIDTH_IN + 1  # geometry.py margin for hands/knuckles
ROOMS = ["hall", "bath", "entry", "bed", "kitchen", "living", "closet"]
E164 = re.compile(r"^\+[1-9]\d{6,14}$")


# ---------------------------------------------------------------- fixtures

def make_run(measurements=(), findings=()) -> Run:
    """A Run without touching RUNS_DIR (mirrors state.load_run)."""
    r = Run.__new__(Run)
    r.id = "eval"
    r.lock = threading.Lock()
    r.events = deque(maxlen=EVENTS_KEEP)
    r.frames, r.conversation, r.confirmations = [], [], []
    r.obligations, r.floorplans, r.approvals = [], [], []
    r.measurements = list(measurements)
    r.findings = list(findings)
    r.escalations = []
    r.discharge_state = "in_review"
    r.current_room = "unknown"
    return r


def lidar_suite(n: int, rng: random.Random) -> list[dict]:
    """Simulated CapturedRoom exports. Widths cluster around real US interior
    doors (24-36 in) with deliberate edge cases at the 29.0 in decision boundary
    and wide openings that RoomPlan labels as doors."""
    meshes = []
    pool = [24.0, 26.0, 27.1, 27.6, 28.0, 28.9, 29.0, 29.1, 30.0, 32.0, 34.0, 36.0]
    for i in range(n):
        room = ROOMS[i % len(ROOMS)]
        doors, truth = [], []
        for _ in range(rng.randint(1, 3)):
            w_in = rng.choice(pool) if rng.random() < 0.7 else round(rng.uniform(23.0, 40.0), 1)
            doors.append({"width_m": w_in / M_TO_IN})
            truth.append({"w_in": round(w_in, 1), "kind": "door",
                          "blocks": round(w_in, 1) < CLEAR_IN})
        openings = []
        for _ in range(rng.randint(0, 2)):
            w_in = rng.choice([31.5, 36.0, 48.0, 72.0, 96.0])  # 72/96 are spans
            openings.append({"width_m": w_in / M_TO_IN})
            truth.append({"w_in": w_in, "kind": "span" if w_in > 60 else "opening",
                          "blocks": w_in <= 60 and w_in < CLEAR_IN})
        if rng.random() < 0.1:  # malformed entry RoomPlan sometimes emits
            doors.append({"width_m": None})
        meshes.append({"mesh": f"{room}_{i:03d}", "room": room, "doors": doors,
                       "openings": openings, "floor_area_m2": round(rng.uniform(3, 25), 1),
                       "truth": truth})
    return meshes


CRITICAL_FINDING = {
    "hazard": True, "severity": "critical", "room": "hall", "category": "floor",
    "finding": "Loose throw rug across the main walking path",
    "rationale_for_patient": "Walker wheels catch on loose edges.",
    "recommendation": "Remove the rug; add a grab bar at the bathroom entry.",
    "steadi_item": "Floors: throw rugs",
}
LOW_FINDING = {
    "hazard": True, "severity": "low", "room": "bed", "category": "lighting",
    "finding": "Dim lamp by the bed", "recommendation": "Add a night light.",
}
REPLACEMENT_FINDING = {
    "hazard": True, "severity": "critical", "room": "bath", "category": "access",
    "finding": "Door too narrow for walker",
    "recommendation": "Prescribe a replacement walker with a narrower frame.",
}


# ------------------------------------------------------------------- twins

class MedplumTwin:
    """Accepts what Medplum's FHIR endpoint would accept; rejects the rest."""
    name = "medplum"

    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.store: dict[str, dict] = {}

    def post_bundle(self, bundle: dict) -> int:
        try:
            json.dumps(bundle)
        except (TypeError, ValueError):
            status = 400
        else:
            ok = bundle.get("resourceType") == "Bundle" and isinstance(bundle.get("entry"), list) \
                and all("resource" in e and "resourceType" in e["resource"] for e in bundle["entry"])
            status = 201 if ok else 422
            if ok:
                for e in bundle["entry"]:
                    self.store[e["resource"].get("id") or f"r{len(self.store)}"] = e["resource"]
        self.calls.append({"status": status, "n_entries": len(bundle.get("entry", []))})
        return status


class TwilioTwin:
    """Enforces Messages.create constraints: E.164 To, non-empty body <= 1600."""
    name = "twilio"

    def __init__(self) -> None:
        self.calls: list[dict] = []

    def create_message(self, to: str, from_: str, body: str) -> int:
        ok = bool(E164.match(to or "")) and bool(E164.match(from_ or "")) \
            and 0 < len(body or "") <= 1600
        status = 201 if ok else 400
        self.calls.append({"status": status, "to": to, "len": len(body or "")})
        return status


def sms_for(run: Run, mesh: dict) -> str:
    blocked = [m for m in run.measurements if m.get("walker_clears") is False]
    if blocked:
        m = blocked[0]
        return (f"SafeStep: {m['label']} measured {m['width_in']} in; Monica's walker is "
                f"{WALKER_WIDTH_IN:.0f} in. The care team has been notified. "
                f"Open the walkthrough report for the fix list.")
    return f"SafeStep: {mesh['room']} checked; walker clearance OK."


# ------------------------------------------------------------------ suites

def eval_geometry(meshes: list[dict]) -> dict:
    tp = fp = fn = tn = 0
    span_ok = span_total = 0
    unit_err = []
    for m in meshes:
        payload = {k: m[k] for k in ("room", "doors", "openings", "floor_area_m2")}
        out = ingest_roomplan(payload)
        widths = [x for x in out if x.get("kind") in ("door", "opening", "span")]
        assert len(widths) == len(m["truth"]), (m["mesh"], len(widths), len(m["truth"]))
        for got, want in zip(widths, m["truth"]):
            unit_err.append(abs(got["width_in"] - want["w_in"]))
            if want["kind"] == "span":
                span_total += 1
                span_ok += got["kind"] == "span"
                continue
            flagged = got.get("walker_clears") is False
            tp += flagged and want["blocks"]; fp += flagged and not want["blocks"]
            fn += (not flagged) and want["blocks"]; tn += (not flagged) and not want["blocks"]
    prec = tp / (tp + fp) if tp + fp else 1.0
    rec = tp / (tp + fn) if tp + fn else 1.0
    return {"doors_evaluated": tp + fp + tn + fn, "blocked_truth": tp + fn,
            "flagged": tp + fp, "true_positive": tp, "false_positive": fp,
            "false_negative": fn, "precision": round(prec, 4), "recall": round(rec, 4),
            "spans_evaluated": span_total, "spans_correct": span_ok,
            "max_unit_error_in": round(max(unit_err), 3) if unit_err else 0.0}


def eval_escalations(meshes: list[dict]) -> dict:
    checks = {"door_to_ot_md": [0, 0], "critical_to_coordinator": [0, 0],
              "uncovered_to_social_work": [0, 0], "routine_always_present": [0, 0],
              "ordering": [0, 0], "no_door_no_clinical": [0, 0]}

    def tick(k, ok): checks[k][0] += ok; checks[k][1] += 1

    for m in meshes:
        payload = {k: m[k] for k in ("room", "doors", "openings", "floor_area_m2")}
        meas = ingest_roomplan(payload)
        has_block = any(x.get("walker_clears") is False for x in meas)
        run = make_run(meas, [CRITICAL_FINDING, LOW_FINDING])
        esc = build_escalations(run, scored_obligations=[])
        levels = [e["level"] for e in esc]
        clinical = [e for e in esc if e["level"] == "clinical"]
        if has_block:
            tick("door_to_ot_md", bool(clinical) and clinical[0]["owner"] == "OT + discharging MD"
                 and "before" in clinical[0]["deadline"])
        else:
            tick("no_door_no_clinical", not clinical)
        tick("critical_to_coordinator", any(e["level"] == "operational"
                                            and "coordinator" in e["owner"].lower() for e in esc))
        tick("uncovered_to_social_work", any(e["level"] == "social"
                                             and "grab bar" in e["observed"].lower() for e in esc))
        tick("routine_always_present", levels and levels[-1] == "routine")
        order = {"clinical": 0, "operational": 1, "social": 2, "routine": 3}
        tick("ordering", [order[l] for l in levels] == sorted(order[l] for l in levels))
    return {k: {"passed": v[0], "total": v[1]} for k, v in checks.items()}


def eval_fhir(meshes: list[dict], twin: MedplumTwin | None) -> dict:
    bad_shape = bad_status = bad_code = walker_leak = 0
    posted = accepted = 0
    for i, m in enumerate(meshes):
        payload = {k: m[k] for k in ("room", "doors", "openings", "floor_area_m2")}
        meas = ingest_roomplan(payload)
        findings = [CRITICAL_FINDING] + ([REPLACEMENT_FINDING] if i % 5 == 0 else [])
        run = make_run(meas, findings)
        run.escalations = build_escalations(run, [])
        bundle = draft_bundle(run)
        if bundle.get("resourceType") != "Bundle" or not any(
                t.get("code") == "DRAFT" for t in bundle.get("meta", {}).get("tag", [])):
            bad_shape += 1
        codes_seen = set()
        for e in bundle["entry"]:
            r = e["resource"]
            if r["resourceType"] not in ("Observation", "ServiceRequest", "Task"):
                bad_shape += 1
            ref = (r.get("subject") or r.get("for") or {}).get("reference", "")
            if not ref.startswith("Patient/"):
                bad_shape += 1
            if r["resourceType"] == "ServiceRequest":
                if r.get("status") != "draft" or r.get("intent") != "proposal":
                    bad_status += 1
                for c in r["code"].get("coding", []):
                    codes_seen.add(c["code"])
                    if c["code"] not in {v[0] for v in DME_CATALOG.values()}:
                        bad_code += 1
        # E0143 only when a *replacement* walker was recommended
        if "E0143" in codes_seen and i % 5 != 0:
            walker_leak += 1
        if "E0143" not in codes_seen and i % 5 == 0:
            walker_leak += 1
        if twin is not None:
            posted += 1
            accepted += twin.post_bundle(bundle) == 201
    return {"bundles": len(meshes), "malformed_resources": bad_shape,
            "servicerequest_status_errors": bad_status, "unknown_hcpcs": bad_code,
            "walker_catalog_errors": walker_leak,
            "twin_posted": posted, "twin_accepted": accepted}


def eval_twilio(meshes: list[dict], twin: TwilioTwin) -> dict:
    sent = 0
    for m in meshes:
        payload = {k: m[k] for k in ("room", "doors", "openings", "floor_area_m2")}
        run = make_run(ingest_roomplan(payload))
        sent += twin.create_message("+16175550142", "+14479021168", sms_for(run, m)) == 201
    # negative controls: the twin must reject what Twilio rejects
    rejected = sum(twin.create_message(*bad) != 201 for bad in [
        ("6175550142", "+14479021168", "no plus"),
        ("+16175550142", "+14479021168", ""),
        ("+16175550142", "+14479021168", "x" * 1601)])
    return {"messages": len(meshes), "delivered": sent,
            "negative_controls": 3, "negative_controls_rejected": rejected}


# -------------------------------------------------------------------- main

def run(suite: str, twins: list[str], seed: int, out: str | None) -> int:
    n = int(suite.split("_")[1]) if "_" in suite else 50
    rng = random.Random(seed)
    t0 = time.time()
    meshes = lidar_suite(n, rng)
    print(f"[eval] suite={suite} seed={seed} meshes={n} twins={','.join(twins) or 'none'}")

    med = MedplumTwin() if "medplum" in twins else None
    twi = TwilioTwin() if "twilio" in twins else None

    geo = eval_geometry(meshes)
    print(f"[geometry]    doors={geo['doors_evaluated']} blocked={geo['blocked_truth']} "
          f"flagged={geo['flagged']} precision={geo['precision']:.3f} recall={geo['recall']:.3f} "
          f"spans {geo['spans_correct']}/{geo['spans_evaluated']} "
          f"max unit error {geo['max_unit_error_in']} in")

    esc = eval_escalations(meshes)
    esc_pass = sum(v["passed"] for v in esc.values()); esc_tot = sum(v["total"] for v in esc.values())
    print(f"[escalations] {esc_pass}/{esc_tot} routing assertions " +
          " ".join(f"{k}={v['passed']}/{v['total']}" for k, v in esc.items()))

    fhir = eval_fhir(meshes, med)
    print(f"[fhir]        bundles={fhir['bundles']} malformed={fhir['malformed_resources']} "
          f"status_errors={fhir['servicerequest_status_errors']} unknown_hcpcs={fhir['unknown_hcpcs']} "
          f"walker_catalog_errors={fhir['walker_catalog_errors']}"
          + (f" medplum_twin {fhir['twin_accepted']}/{fhir['twin_posted']} 201" if med else ""))

    sms = eval_twilio(meshes, twi) if twi else None
    if sms:
        print(f"[twilio]      twin {sms['delivered']}/{sms['messages']} 201 · "
              f"negative controls rejected {sms['negative_controls_rejected']}/{sms['negative_controls']}")

    failures = (geo["false_positive"] + geo["false_negative"]
                + (geo["spans_evaluated"] - geo["spans_correct"]) + (esc_tot - esc_pass)
                + fhir["malformed_resources"] + fhir["servicerequest_status_errors"]
                + fhir["unknown_hcpcs"] + fhir["walker_catalog_errors"]
                + (fhir["twin_posted"] - fhir["twin_accepted"])
                + ((sms["messages"] - sms["delivered"]) + (3 - sms["negative_controls_rejected"]) if sms else 0))
    total = (geo["doors_evaluated"] + geo["spans_evaluated"] + esc_tot + fhir["bundles"] * 4
             + fhir["twin_posted"] + (sms["messages"] + 3 if sms else 0))
    rate = 100.0 * (total - failures) / total
    elapsed = time.time() - t0
    print(f"[eval] {total} assertions · {failures} failed · {rate:.1f}% · {elapsed:.2f}s")

    result = {"suite": suite, "seed": seed, "meshes": n, "twins": twins,
              "geometry": geo, "escalations": esc, "fhir": fhir, "twilio": sms,
              "assertions": total, "failures": failures, "pass_rate": round(rate, 2),
              "elapsed_s": round(elapsed, 2), "walker_width_in": WALKER_WIDTH_IN,
              "clearance_threshold_in": CLEAR_IN}
    if out:
        with open(out, "w") as fh:
            json.dump(result, fh, indent=2)
        print(f"[eval] wrote {out}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--suite", default="lidar_50", help="lidar_<N> simulated meshes")
    ap.add_argument("--twins", default="medplum,twilio")
    ap.add_argument("--seed", type=int, default=20260913)
    ap.add_argument("--out", default=None, help="write JSON results here")
    a = ap.parse_args()
    sys.exit(run(a.suite, [t for t in a.twins.split(",") if t], a.seed, a.out))
