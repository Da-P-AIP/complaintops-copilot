"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import type { ClosureResult, Resolutions, KnowledgeRule } from "@/lib/types";

const RES_ITEMS: { key: keyof Resolutions; label: string }[] = [
  { key: "supervisor_reported", label: "上司報告を完了した" },
  { key: "approved", label: "返金・補償の承認を得た" },
  { key: "evidence_checked", label: "証拠（注文番号・写真など）を確認した" },
  { key: "customer_replied", label: "顧客へ返信した" },
];

export function ClosurePanel({ caseId, initialReport }: { caseId: string; initialReport?: string }) {
  const [report, setReport] = useState<string>(initialReport ?? "");
  const [res, setRes] = useState<Resolutions>({});
  const [closure, setClosure] = useState<ClosureResult | null>(null);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [learned, setLearned] = useState<KnowledgeRule | null>(null);

  const refresh = () => api.getClosure(caseId).then(setClosure).catch(() => {});
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);
  useEffect(() => {
    if (initialReport) setReport(initialReport);
  }, [initialReport]);

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

  const saveReport = async () => {
    if (!report.trim()) return;
    setBusy(true);
    try {
      await api.saveReport(caseId, report);
      setSavedMsg("保存しました ✓");
      setTimeout(() => setSavedMsg(""), 2500);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗");
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
      const r = await api.closeCase(caseId);
      setClosed(true);
      if (r.learned) setLearned(r.learned);
    } catch (e) {
      alert(e instanceof Error ? e.message : "クローズに失敗");
    } finally {
      setBusy(false);
    }
  };

  const extractRule = async () => {
    setBusy(true);
    try {
      setLearned(await api.extractRule(caseId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "抽出に失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="section-title">報告書（編集して保存できる書類）＆クローズ</p>

      <div className="grid-2">
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn sm" onClick={genReport} disabled={busy}>{report ? "下書きを再生成" : "報告書を生成"}</button>
            <button className="btn sm ghost" onClick={saveReport} disabled={busy || !report.trim()}>保存</button>
            {savedMsg && <span className="hint" style={{ color: "var(--ok)" }}>{savedMsg}</span>}
          </div>
          <textarea
            className="text-input"
            style={{ marginTop: 10, minHeight: 260, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="「報告書を生成」で下書きが入ります。担当者の対応や評価・改善点を自由に追記して「保存」してください。"
          />
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

        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <button className="btn sm ghost" onClick={extractRule} disabled={busy}>🧠 この対応から学びを抽出</button>
          {learned && (
            <div className="say" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700 }}>📘 社内ルール候補を抽出しました（{learned.category}）</div>
              <div style={{ marginTop: 2 }}>{learned.statement}</div>
              <div className="hint" style={{ marginTop: 4 }}>管理画面で承認すると、次回以降の現場助言に自動反映されます。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
