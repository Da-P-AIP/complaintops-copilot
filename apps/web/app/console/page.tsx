"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/apiClient";
import { industryOf } from "@/lib/industry";
import { PracticePanel } from "../../components/console/PracticePanel";
import type { CompanyRules } from "@/lib/types";

export default function ConsolePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"live" | "practice">("live");
  const [policy, setPolicy] = useState<CompanyRules | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("practice")) setMode("practice");
    api.getActivePolicy().then((p) => { setPolicy(p); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const isConfigured = !!(policy && (policy.company_name || policy.operator_name || policy.industry_id));
  const industry = industryOf(policy?.industry_id);

  const startLive = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api.createCase();
      router.push(`/cases/${c.id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "起動に失敗");
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: 4 }}>対応コンソール</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>本番のクレーム対応と、練習（シミュレーター）をここから始めます。</p>

      <div className="sim-bar" style={{ marginTop: 8 }}>
        <button className={`choice${mode === "live" ? " sel" : ""}`} onClick={() => setMode("live")}>🛡 本番対応</button>
        <button className={`choice${mode === "practice" ? " sel" : ""}`} onClick={() => setMode("practice")}>🧪 練習（シミュレーター）</button>
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {mode === "live" ? (
        <div className="card" style={{ marginTop: 8, borderLeft: `4px solid ${industry.color}` }}>
          <p className="section-title">本番対応</p>
          {!loaded ? (
            <p className="hint">読み込み中…</p>
          ) : isConfigured ? (
            <>
              <p style={{ marginTop: 0 }}>
                会社設定：<strong>{policy?.company_name || "未設定"}</strong>{" "}
                <span className="hint">（{industry.icon} {industry.label}{policy?.operator_name ? ` / 担当 ${policy.operator_name}` : ""}）</span>
              </p>
              <div className="cta-row">
                <button className="btn" onClick={startLive} disabled={busy}>{busy ? "起動中…" : "新規ケースで対応を開始 →"}</button>
                <Link className="btn ghost" href="/admin">進行中・過去の案件（管理）</Link>
                <Link className="btn ghost sm" href="/setup">初期設定をやり直す</Link>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: "var(--warn)", fontWeight: 700, marginTop: 0 }}>まず初期設定が必要です</p>
              <p className="hint">会社名・業種・呼称・禁忌ルールを作ると、本番対応が使えます（約1分）。</p>
              <Link className="btn" href="/setup">初期設定を始める →</Link>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <PracticePanel />
        </div>
      )}
    </div>
  );
}
