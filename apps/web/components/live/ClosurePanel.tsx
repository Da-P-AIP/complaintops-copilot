"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import type { ClosureResult, Resolutions } from "@/lib/types";

const RES_ITEMS: { key: keyof Resolutions; label: string }[] = [
  { key: "supervisor_reported", label: "上司報告を完了した" },
  { key: "approved", label: "返金・補償の承認を得た" },
  { key: "evidence_checked", label: "証拠（注文番号・写真など）を確認した" },
  { key: "customer_replied", label: "顧客へ返信した" },
];

export function ClosurePanel({ caseId }: { caseId: string }) {
  const [report, setReport] = useState<string | null>(null);
  const [res, setRes] = useState<Resolutions>({});
  const [closure, setClosure] = useState<ClosureResult | null>(null);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => api.getClosure(caseId).then(setClosure).catch(() => {});
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const genReport = async () => {
    setBusy(true);
    try {
      const r = await api.generateReport(caseId);
      setReport(r.markdown);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (key: keyof Resolutions) => {
    const v = !res[key];
    setRes((p) => ({ ...p, [key]: v }));
    await api.updateResolution(caseId, key, v);
    await refresh();
  };

  const doClose = async () => {
    setBusy(true);
    try {
      await api.closeCase(caseId);
      setClosed(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "クローズに失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="section-title">対応を閉じる（クローズゲート）</p>

      <div className="grid-2">
        <div>
          <button className="btn sm" onClick={genReport} disabled={busy}>
            {report ? "報告書を再生成" : "報告書を生成"}
          </button>
          {report && <pre className="code" style={{ marginTop: 10, maxHeight: 240, overflow: "auto" }}>{report}</pre>}
        </div>

        <div>
          <p className="section-title">残務チェック</p>
          {RES_ITEMS.map((it) => (
            <div className="toggle" key={it.key} onClick={() => toggle(it.key)} style={{ cursor: "pointer" }}>
              <div className="label"><span className="t">{it.label}</span></div>
              <div className={`switch${res[it.key] ? " on" : ""}`} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {closed ? (
          <p style={{ color: "var(--ok)", fontWeight: 700 }}>✅ この案件はクローズされました。</p>
        ) : closure?.closure_status === "closeable" ? (
          <>
            <p style={{ color: "var(--ok)" }}>この案件はクローズ可能です。</p>
            <button className="btn" onClick={doClose} disabled={busy}>案件をクローズする</button>
          </>
        ) : (
          <>
            <p style={{ color: "var(--warn)", fontWeight: 700 }}>まだクローズできません</p>
            {(closure?.blocking_reasons ?? []).map((r) => (
              <div className="forbidden" key={r}><div className="r" style={{ color: "#fca5a5" }}>・{r}</div></div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
