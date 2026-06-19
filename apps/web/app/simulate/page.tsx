"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient";
import { ConversationLog } from "../../components/live/ConversationLog";
import { RiskPanel } from "../../components/live/RiskPanel";
import { AdvicePanel } from "../../components/live/AdvicePanel";
import type { Scenario, ConversationEvent, AnalyzeResult } from "@/lib/types";

export default function SimulatePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSimulations().then(setScenarios).catch((e) =>
      setError(e instanceof Error ? e.message : "シナリオ取得に失敗（APIを確認）"),
    );
  }, []);

  const startScenario = async (s: Scenario) => {
    setBusy(true);
    setError(null);
    try {
      const c = await api.createCase();
      const sess = await api.startSession(c.id);
      setSessionId(sess.id);
      setScenario(s);
      setEvents([]);
      setAnalysis(null);
      setLineIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "開始に失敗");
    } finally {
      setBusy(false);
    }
  };

  const nextCustomerLine = async () => {
    if (!scenario || !sessionId || lineIdx >= scenario.lines.length) return;
    const text = scenario.lines[lineIdx];
    setBusy(true);
    try {
      const r = await api.addEvent(sessionId, text);
      setEvents((p) => [...p, r.event]);
      if (r.analysis) setAnalysis(r.analysis);
      setLineIdx((i) => i + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  // 担当者の返答を「選択肢」で選ぶ（クレーム対応にも選択肢を、の簡易版）
  const pickReply = (text: string) => {
    setEvents((p) => [
      ...p,
      { id: `op_${Date.now()}`, session_id: sessionId ?? "", case_id: "", speaker: "operator", text, created_at: new Date().toISOString() },
    ]);
  };

  const done = scenario ? lineIdx >= scenario.lines.length : false;

  return (
    <div className="container">
      <h2 style={{ marginBottom: 4 }}>クレーム会話シミュレーション（練習モード）</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        AIがクレーム客を演じます。発話ごとの危険度・禁忌・推奨返答を見ながら、選ぶだけで安全な対応を練習できます。
      </p>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="sim-bar">
        <span className="hint">シナリオ:</span>
        {scenarios.map((s) => (
          <button key={s.id} className={`choice${scenario?.id === s.id ? " sel" : ""}`} onClick={() => startScenario(s)} disabled={busy}>
            {s.label}
          </button>
        ))}
      </div>

      {!scenario && <p style={{ color: "var(--muted)" }}>上のシナリオを選んで開始してください。</p>}

      {scenario && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <p className="section-title">進行</p>
              {!done ? (
                <button className="btn" onClick={nextCustomerLine} disabled={busy}>
                  {lineIdx === 0 ? "クレーム客の発話を再生 ▶" : `次の発話を再生（${lineIdx}/${scenario.lines.length}）▶`}
                </button>
              ) : (
                <p style={{ color: "var(--ok)" }}>シナリオ完了。落ち着いて対応できましたか？</p>
              )}
            </div>
            <ConversationLog events={events} />
          </div>

          <RiskPanel analysis={analysis} />

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AdvicePanel analysis={analysis} />
            {analysis && analysis.say_this.length > 0 && (
              <div className="card">
                <p className="section-title">推奨返答を選ぶ（タップで担当者の発話に）</p>
                <div className="choices" style={{ flexDirection: "column" }}>
                  {analysis.say_this.map((s, i) => (
                    <button key={i} className="choice reply" onClick={() => pickReply(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
