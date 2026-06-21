"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient";
import { INDUSTRIES, industryOf } from "@/lib/industry";
import { ConversationLog } from "../live/ConversationLog";
import { RiskPanel } from "../live/RiskPanel";
import { AdvicePanel } from "../live/AdvicePanel";
import { OperatorInput } from "../live/OperatorInput";
import { EvaluationPanel } from "../live/EvaluationPanel";
import { FlowPanel } from "../live/FlowPanel";
import { Thinking } from "../live/Thinking";
import type { Scenario, ConversationEvent, AnalyzeResult, Evaluation, FlowState } from "@/lib/types";

export function PracticePanel() {
  const [industryId, setIndustryId] = useState("ec");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const sessionRef = useRef<string | null>(null);
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [resolved, setResolved] = useState(false);
  const [free, setFree] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSimulations().then(setScenarios).catch((e) => setError(e instanceof Error ? e.message : "シナリオ取得に失敗（APIを確認）"));
  }, []);

  const industry = industryOf(industryId);
  const filtered = scenarios.filter((s) => s.industry === industryId);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionRef.current) return sessionRef.current;
    const c = await api.createCase();
    const s = await api.startSession(c.id);
    sessionRef.current = s.id;
    return s.id;
  };

  const sendCustomer = async (text: string) => {
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const r = await api.addEvent(sid, text, industryId);
      setEvents((p) => [...p, r.event]);
      if (r.analysis) setAnalysis(r.analysis);
      if (r.flow) setFlow(r.flow);
      setStarted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  const sendOperator = async (text: string) => {
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const r = await api.addOperatorEvent(sid, text);
      setEvents((p) => [...p, r.event]);
      if (r.evaluation) setEvaluation(r.evaluation);
      if (r.flow) setFlow(r.flow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  const reactCustomer = async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.customerTurn(sid, industryId, industry.label);
      setEvents((p) => [...p, r.event]);
      if (r.analysis) setAnalysis(r.analysis);
      if (r.flow) setFlow(r.flow);
      if (r.resolved) setResolved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  const pickScenario = async (s: Scenario) => {
    setScenario(s);
    setEvents([]);
    setAnalysis(null);
    setEvaluation(null);
    sessionRef.current = null;
    setStarted(false);
    setFlow(null);
    setResolved(false);
    await sendCustomer(s.lines[0]);
  };
  const sendFree = async () => {
    const t = free.trim();
    if (!t) return;
    await sendCustomer(t);
    setFree("");
  };

  return (
    <div style={{ "--accent": industry.color } as React.CSSProperties}>
      <div className="card" style={{ borderLeft: "4px solid var(--warn)", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: "var(--warn)" }}>🧪 練習モード（サンドボックス）</span>
        <span className="hint"> ／ AIがクレーム客を演じます。ここでの会話は学習・対応の練習用で、実際の案件・暗黙知DB・報告書には影響しません。</span>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        業種を選び、シナリオ or 自由入力で開始 → 返答すると客が反応＆評価されます。
      </p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="sim-bar">
        <span className="hint">業種:</span>
        <select className="text-input" style={{ maxWidth: 220 }} value={industryId} onChange={(e) => { setIndustryId(e.target.value); setScenario(null); }}>
          {Object.values(INDUSTRIES).map((m) => (<option key={m.id} value={m.id}>{m.icon} {m.label}</option>))}
        </select>
      </div>

      <div className="sim-bar">
        <span className="hint">シナリオで開始:</span>
        {filtered.length === 0 && <span className="hint">この業種のプリセットはありません。下の自由入力で開始できます。</span>}
        {filtered.map((s) => (<button key={s.id} className={`choice${scenario?.id === s.id ? " sel" : ""}`} onClick={() => pickScenario(s)} disabled={busy}>{s.label}</button>))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title">クレーム客の発話を自分で入力（{industry.icon} {industry.label}）</p>
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
            <p className="section-title">クレーム客（AIが演じます）</p>
            {!started ? (
              <p className="hint">シナリオを選ぶか、自由入力で会話を始めてください。</p>
            ) : (
              <button className="btn" onClick={reactCustomer} disabled={busy}>クレーム客の反応を見る ▶</button>
            )}
            <p className="hint" style={{ marginTop: 8 }}>あなたの対応次第で、客が落ち着いたり強まったりします。</p>
          </div>
          <ConversationLog events={events} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Thinking show={busy} label={resolved ? "対応を記録しています" : "クレーム客／AIが考えています"} />
          <RiskPanel analysis={analysis} />
          <FlowPanel flow={flow} resolved={resolved} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AdvicePanel analysis={analysis} />
          <OperatorInput onSend={sendOperator} disabled={busy} />
          {analysis && analysis.say_this.length > 0 && (
            <div className="card">
              <p className="section-title">推奨返答から選ぶ（タップで記録＆評価）</p>
              <div className="choices" style={{ flexDirection: "column" }}>
                {analysis.say_this.map((s, i) => (<button key={i} className="choice reply" onClick={() => sendOperator(s)} disabled={busy}>{s}</button>))}
              </div>
            </div>
          )}
          <EvaluationPanel evaluation={evaluation} />
        </div>
      </div>
    </div>
  );
}
