"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResult, ConversationEvent } from "@complaintops/shared";
import { api } from "../../../../lib/apiClient";
import { ConversationLog } from "../../../../components/live/ConversationLog";
import { ConversationInput } from "../../../../components/live/ConversationInput";
import { RiskPanel } from "../../../../components/live/RiskPanel";
import { AdvicePanel } from "../../../../components/live/AdvicePanel";

export default function LivePage({ params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .startSession(caseId)
      .then((s) => setSessionId(s.id))
      .catch((e) => setError(e instanceof Error ? e.message : "セッション開始に失敗"));
  }, [caseId]);

  const onSend = async (text: string) => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.addEvent(sessionId, text);
      setEvents((prev) => [...prev, result.event]);
      if (result.analysis) setAnalysis(result.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>現場対応画面</h2>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>case: {caseId}</span>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 4 }}>
        AIが顧客を説得するのではなく、対応中のあなたを守ります。
      </p>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.2fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ConversationInput onSend={onSend} disabled={!sessionId || busy} />
          <ConversationLog events={events} />
        </div>
        <RiskPanel analysis={analysis} />
        <AdvicePanel analysis={analysis} />
      </div>
    </div>
  );
}
