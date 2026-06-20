"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/apiClient";
import type { ComplaintCase, AuditEvent } from "@/lib/types";
import { RiskBadge } from "../../components/common/RiskBadge";

const STATUS_JP: Record<string, string> = {
  new: "新規",
  in_progress: "対応中",
  waiting_manager_approval: "承認待ち",
  resolved_pending_close: "確認中",
  closed: "クローズ",
};

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "16px 8px" }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: color || "var(--text)" }}>{n}</div>
      <div className="hint">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listCases().then(setCases).catch((e) => setError(e instanceof Error ? e.message : "取得に失敗"));
    api.listAudit().then(setAudit).catch(() => {});
  }, []);

  const open = cases.filter((c) => c.status !== "closed").length;
  const high = cases.filter((c) => c.latest_risk && (c.latest_risk.risk_level === "high" || c.latest_risk.risk_level === "critical")).length;
  const approval = cases.filter((c) => c.latest_risk?.approval_required && c.status !== "closed").length;
  const closed = cases.filter((c) => c.status === "closed").length;
  const sorted = [...cases].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const recentAudit = [...audit].reverse().slice(0, 20);

  return (
    <div className="container">
      <h2 style={{ marginBottom: 4 }}>管理者ダッシュボード</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>この組織の案件状況と監査ログを俯瞰します。</p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginTop: 8 }}>
        <Stat n={cases.length} label="総案件" />
        <Stat n={open} label="対応中" color="var(--accent)" />
        <Stat n={high} label="高リスク" color="var(--danger)" />
        <Stat n={approval} label="承認待ち" color="var(--warn)" />
        <Stat n={closed} label="クローズ" color="var(--ok)" />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">案件履歴</p>
        {sorted.length === 0 && <p className="hint">まだ案件がありません。現場対応や練習を行うとここに表示されます。</p>}
        {sorted.map((c) => (
          <div className="list-row" key={c.id}>
            <span style={{ minWidth: 96 }}>
              {c.latest_risk ? <RiskBadge level={c.latest_risk.risk_level} /> : <span className="tag">未判定</span>}
            </span>
            <span className="grow">
              <strong>{c.id}</strong>{" "}
              <span className="hint">{STATUS_JP[c.status] ?? c.status}・{new Date(c.updated_at).toLocaleString("ja-JP")}</span>
            </span>
            <Link className="btn ghost sm" href={`/cases/${c.id}/live`}>開く</Link>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">監査ログ（ハッシュチェーン・直近20件）</p>
        {recentAudit.length === 0 && <p className="hint">ログがありません。</p>}
        {recentAudit.map((e) => (
          <div className="list-row" key={e.id}>
            <span className="grow" style={{ fontSize: 13 }}>
              <strong>{e.action}</strong> <span className="hint">by {e.actor}・{new Date(e.created_at).toLocaleTimeString("ja-JP")}</span>
            </span>
            <span className="hint" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
              {e.prev_hash.slice(0, 6)}→{e.event_hash.slice(0, 6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
