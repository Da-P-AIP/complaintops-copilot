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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>現場対応画面</h2>
        <span style={{ color: industry.color, fontWeight: 700 }}>クレーム No.{caseNo ?? "—"}</span>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ConversationInput onSend={onSend} disabled={!sessionId || busy} samples={industry.samples} />
          <OperatorInput onSend={onOperator} disabled={!sessionId || busy} />
          <ConversationLog events={events} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Thinking show={busy} label="AIが判定しています" />
          <RiskPanel analysis={analysis} />
          <FlowPanel flow={flow} />
        </div>
        <AdvicePanel analysis={analysis} />
      </div>

      <EvaluationPanel evaluation={evaluation} />
      <ImprovementPanel analysis={analysis} />
      <ClosurePanel caseId={caseId} initialReport={initialReport} />
    </div>
  );
}
