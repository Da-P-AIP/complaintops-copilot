"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResult, ConversationEvent, CompanyRules, Evaluation, FlowState } from "@/lib/types";
import { api } from "../../../../lib/apiClient";
import { industryOf } from "@/lib/industry";
import { ConversationLog } from "../../../../components/live/ConversationLog";
import { ConversationInput } from "../../../../components/live/ConversationInput";
import { OperatorInput } from "../../../../components/live/OperatorInput";
import { RiskPanel } from "../../../../components/live/RiskPanel";
import { AdvicePanel } from "../../../../components/live/AdvicePanel";
import { EvaluationPanel } from "../../../../components/live/EvaluationPanel";
import { ImprovementPanel } from "../../../../components/live/ImprovementPanel";
import { FlowPanel } from "../../../../components/live/FlowPanel";
import { Thinking } from "../../../../components/live/Thinking";
import { ClosurePanel } from "../../../../components/live/ClosurePanel";

export default function LivePage({ params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [policy, setPolicy] = useState<CompanyRules | null>(null);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [caseNo, setCaseNo] = useState<number | undefined>(undefined);
  const [initialReport, setInitialReport] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.startSession(caseId).then((s) => setSessionId(s.id)).catch((e) => setError(e instanceof Error ? e.message : "セッション開始に失敗"));
    api.getActivePolicy().then(setPolicy).catch(() => {});
    api.getCase(caseId).then((c) => { setCaseNo(c.case_no); if (c.report) setInitialReport(c.report.markdown); }).catch(() => {});
  }, [caseId]);

  const industry = industryOf(policy?.industry_id);

  const last = events[events.length - 1];
  const navStep = events.length === 0 ? 1 : last?.speaker === "customer" ? 4 : 1;
  const navDone = flow?.resolved ?? false;
  const navMsg = busy
    ? "AIが対応を考えています…"
    : events.length === 0
    ? "まず顧客の発話を入力し、「送信して判定」を押してください"
    : last?.speaker === "customer"
    ? "助言（③）を確認し、担当者の対応を記録（④）しましょう。推奨返答のタップでもOKです"
    : "次の顧客発話を入力するか、対応フローを進めましょう";

  const onSend = async (text: string) => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.addEvent(sessionId, text);
      setEvents((prev) => [...prev, result.event]);
      if (result.analysis) setAnalysis(result.analysis);
      if (result.flow) setFlow(result.flow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  const onOperator = async (text: string) => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.addOperatorEvent(sessionId, text);
      setEvents((prev) => [...prev, result.event]);
      if (result.evaluation) setEvaluation(result.evaluation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ "--accent": industry.color } as React.CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>対応コンソール（本番）</h2>
        <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <a href="/console#practice" className="hint" style={{ color: "var(--warn)" }}>🧪 練習を開く</a>
          <span style={{ color: industry.color, fontWeight: 700 }}>クレーム No.{caseNo ?? "—"}</span>
        </span>
      </div>

      <div className="card" style={{ marginTop: 10, borderLeft: `4px solid ${industry.color}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24 }}>{industry.icon}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800 }}>
            {policy?.company_name || "未設定の会社"} <span style={{ color: industry.color, fontSize: 13 }}>（{industry.label}）</span>
          </div>
          <div className="hint">{policy?.operator_name ? `担当: ${policy.operator_name}・` : ""}この組織の会社ルールが判定に反映されています。</div>
        </div>
      </div>

      <p style={{ color: "var(--muted)", marginTop: 8 }}>AIが顧客を説得するのではなく、対応中のあなたを守ります。</p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className={`nav-step${navDone ? " done" : ""}`}>
        <span className="num">{navDone ? "✓" : navStep}</span>
        <span>{navDone ? "対応フロー完了。報告書を確認してクローズできます。" : `次にやること: ${navMsg}`}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ConversationLog events={events} maxHeight={340} />
          <ConversationInput onSend={onSend} disabled={!sessionId || busy} samples={industry.samples} step={1} />
          <OperatorInput onSend={onOperator} disabled={!sessionId || busy} step={4} suggestions={analysis?.say_this ?? []} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Thinking show={busy} label="AIが判定しています" />
          <RiskPanel analysis={analysis} step={2} />
          <FlowPanel flow={flow} />
        </div>
        <AdvicePanel analysis={analysis} step={3} />
      </div>

      <EvaluationPanel evaluation={evaluation} />
      <ImprovementPanel analysis={analysis} />
      <ClosurePanel caseId={caseId} initialReport={initialReport} />
    </div>
  );
}
