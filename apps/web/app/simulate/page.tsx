"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient";
import { INDUSTRIES, industryOf } from "@/lib/industry";
import { ConversationLog } from "../../components/live/ConversationLog";
import { RiskPanel } from "../../components/live/RiskPanel";
import { AdvicePanel } from "../../components/live/AdvicePanel";
import type { Scenario, ConversationEvent, AnalyzeResult } from "@/lib/types";

export default function SimulatePage() {
  const [industryId, setIndustryId] = useState("ec");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [free, setFree] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSimulations().then(setScenarios).catch((e) => setError(e instanceof Error ? e.message : "シナリオ取得に失敗（APIを確認）"));
  }, []);

  const industry = industryOf(industryId);
  const filtered = scenarios.filter((s) => s.industry === industryId);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    const c = await api.createCase();
    const s = await api.startSession(c.id);
    setSessionId(s.id);
    return s.id;
  };

  const sendCustomer = async (text: string) => {
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const r = await api.addEvent(sid, text);
      setEvents((p) => [...p, r.event]);
      if (r.analysis) setAnalysis(r.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  const playLine = async (s: Scenario, idx: number) => {
    if (idx >= s.lines.length) return;
    await sendCustomer(s.lines[idx]);
    setLineIdx(idx + 1);
  };
  const pickScenario = async (s: Scenario) => {
    setScenario(s);
    setLineIdx(0);
    setEvents([]);
    setAnalysis(null);
    await playLine(s, 0);
  };
  const nextLine = async () => {
    if (!scenario) return;
    await playLine(scenario, lineIdx);
  };
  const sendFree = async () => { const t = free.trim(); if (!t) return; await sendCustomer(t); setFree(""); };
  const pickReply = (text: string) =>
    setEvents((p) => [...p, { id: `op_${Date.now()}`, session_id: sessionId ?? "", case_id: "", speaker: "operator", text, created_at: new Date().toISOString() }]);

  const done = scenario ? lineIdx >= scenario.lines.length : false;

  return (
    <div className="container" style={{ "--accent": industry.color } as React.CSSProperties}>
      <h2 style={{ marginBottom: 4 }}>クレーム会話シミュレーション（練習モード）</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        AIがクレーム客を演じます。業種を選んで、シナリオ再生 or 自分でクレームを入力して、安全な対応を練習できます。
      </p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="sim-bar">
        <span className="hint">業種:</span>
        <select className="text-input" style={{ maxWidth: 220 }} value={industryId} onChange={(e) => { setIndustryId(e.target.value); setScenario(null); }}>
          {Object.values(INDUSTRIES).map((m) => (<option key={m.id} value={m.id}>{m.icon} {m.label}</option>))}
        </select>
      </div>

      <div className="sim-bar">
        <span className="hint">シナリオ:</span>
        {filtered.length === 0 && <span className="hint">この業種のプリセットはありません。下の自由入力で練習できます。</span>}
        {filtered.map((s) => (<button key={s.id} className={`choice${scenario?.id === s.id ? " sel" : ""}`} onClick={() => pickScenario(s)} disabled={busy}>{s.label}</button>))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title">自分でクレームを入力（{industry.icon} {industry.label}）</p>
        <div className="input-row">
          <input className="text-input" value={free} placeholder="クレーム客のセリフを入力…" onChange={(e) => setFree(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendFree()} disabled={busy} />
          <button className="btn" onClick={sendFree} disabled={busy || !free.trim()}>送信して判定</button>
        </div>
        {industry.samples.length > 0 && (
          <div className="samples" style={{ flexDirection: "column", alignItems: "stretch", gap: 6, marginTop: 8 }}>
            <span className="hint">例（クリックで入力）:</span>
            {industry.samples.map((s, i) => (<button key={i} className="chip reply" style={{ textAlign: "left", whiteSpace: "normal" }} onClick={() => setFree(s)}>{s}</button>))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <p className="section-title">シナリオ進行</p>
            {!scenario ? (
              <p className="hint">シナリオを選ぶか、上の自由入力で開始できます。</p>
            ) : !done ? (
              <button className="btn" onClick={nextLine} disabled={busy}>{lineIdx === 0 ? "クレーム客の発話を再生 ▶" : `次の発話を再生（${lineIdx}/${scenario.lines.length}）▶`}</button>
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
                {analysis.say_this.map((s, i) => (<button key={i} className="choice reply" onClick={() => pickReply(s)}>{s}</button>))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
