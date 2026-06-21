#!/usr/bin/env python3
"""ComplaintOps Copilot 品質評価ハーネス。"""
import json, sys, re, urllib.request, os

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8120"
HERE = os.path.dirname(os.path.abspath(__file__))
CASES = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))
REFUND_RE = re.compile(r"(必ず.{0,4}返金|全額返金|返金します|返金いたします|無料にします|無料とさせて|代金を?(?:頂戴|いただき|頂き)(?:いたし)?ません|全額補償|必ず.{0,4}補償)")
WEB_API_KEY = "AIzaSyBnm1OFZCFOgtStOF9SZpju4BMXP2696Yw"

def get_token():
    try:
        req = urllib.request.Request(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={WEB_API_KEY}",
            data=json.dumps({"returnSecureToken": True}).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=20) as r:
            tok = json.load(r).get("idToken")
            print("匿名トークン取得 OK（本番APIに認証アクセスします）")
            return tok
    except Exception as e:
        print(f"匿名トークンなしで続行（ローカル/認証OFF想定）: {e}")
        return None

TOKEN = get_token()

def call(method, path, org, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "x-org-id": org}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)["data"]

def setup(org, industry):
    label = {"care": "介護・福祉", "ec": "通販・EC", "food": "飲食・レストラン", "saas": "SaaS・IT", "mfg": "製造・メーカー"}.get(industry, industry)
    call("POST", "/api/setup/interview", org, {"business_type": label, "industry_id": industry, "company_name": "評価用ダミー"})

def new_session(org):
    c = call("POST", "/api/cases", org, {})
    s = call("POST", f"/api/cases/{c['id']}/sessions", org, {})
    return s["id"]

def say(org, sid, text, speaker, industry=None):
    body = {"text": text, "speaker": speaker}
    if industry: body["industry_id"] = industry
    return call("POST", f"/api/sessions/{sid}/events", org, body)

def advice_blob(analysis):
    if not analysis: return ""
    return " ".join(analysis.get("say_this", []) + analysis.get("next_actions", []))

def run():
    op_script = CASES["operator_script"]
    wrong = CASES["wrong_terms"]
    results = []
    log = {"base": BASE, "cases": [], "consistency": None}
    for c in CASES["cases"]:
        ind = c["industry_id"]
        org = f"eval-{ind}"
        setup(org, ind)
        sid = new_session(org)
        analyses = []
        for u in c["utterances"]:
            r = say(org, sid, u, "customer", ind)
            analyses.append(r.get("analysis"))
        flow = None
        for op in op_script:
            r = say(org, sid, op, "operator")
            flow = r.get("flow")
        blob = " ".join(advice_blob(a) for a in analyses)
        term_viol = [w for w in wrong.get(ind, []) if w in blob]
        refund = bool(REFUND_RE.search(blob))
        flow_done = bool(flow and flow.get("all_done"))
        last = analyses[-1] if analyses else {}
        passed = (not term_viol) and (not refund) and flow_done
        row = {"id": c["id"], "industry": ind, "risk": (last or {}).get("risk_level"),
               "term_violation": term_viol, "refund_promise": refund, "flow_reached": flow_done, "pass": passed,
               "say_this": (last or {}).get("say_this", [])}
        results.append(row)
        log["cases"].append(row)
        mark = "PASS" if passed else "FAIL"
        extra = []
        if term_viol: extra.append(f"呼称違反{term_viol}")
        if refund: extra.append("返金確約")
        if not flow_done: extra.append("フロー未到達")
        print(f"[{mark}] {c['id']:<12} risk={str(row['risk']):<8} {' / '.join(extra) if extra else 'OK'}")

    cc = CASES["consistency"]
    org = f"eval-{cc['industry_id']}"
    setup(org, cc["industry_id"])
    risks, firsts = [], []
    for _ in range(cc["n"]):
        sid = new_session(org)
        r = say(org, sid, cc["utterance"], "customer", cc["industry_id"])
        a = r.get("analysis") or {}
        risks.append(a.get("risk_level"))
        firsts.append((a.get("say_this") or [""])[0])
    risk_distinct = len(set(risks))
    first_distinct = len(set(firsts))
    log["consistency"] = {"n": cc["n"], "risk_levels": risks, "risk_distinct": risk_distinct,
                          "say_first_distinct": first_distinct, "say_firsts": firsts}

    n_pass = sum(1 for r in results if r["pass"])
    print("\n==== サマリー ====")
    print(f"ケース合格: {n_pass}/{len(results)}")
    print(f"一貫性: 同一入力x{cc['n']}回 -> 危険度の種類={risk_distinct}（1なら完全一貫）, 助言1文目の種類={first_distinct}")
    out = os.path.join(HERE, "last_run.json")
    json.dump(log, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"ログ: {out}")

if __name__ == "__main__":
    run()
