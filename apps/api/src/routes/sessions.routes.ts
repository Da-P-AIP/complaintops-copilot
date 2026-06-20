import { Router } from "express";
import type { ConversationEvent, Speaker, AnalyzeResult, Evaluation } from "@complaintops/shared";
import { getStore, genId } from "../db/store";
import { ok, fail } from "../utils/response";
import { analyzeUtterance } from "../orchestrator/ComplaintOpsOrchestrator";
import { evaluateAgent } from "../agents/evaluateAgent";

export const sessionsRouter = Router();

// POST /api/sessions/:sessionId/events
sessionsRouter.post("/:sessionId/events", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const s = await store.getSession(orgId, req.params.sessionId);
  if (!s) return fail(res, "NOT_FOUND", "セッションが見つかりません", 404);

  const text = (req.body?.text ?? "").toString();
  if (!text.trim()) return fail(res, "VALIDATION_ERROR", "text は必須です");

  const speaker: Speaker = (req.body?.speaker as Speaker) || "customer";
  const ev: ConversationEvent = {
    id: genId("evt"),
    session_id: s.id,
    case_id: s.case_id,
    speaker,
    text,
    created_at: new Date().toISOString(),
  };
  await store.addEvent(orgId, ev);

  let analysis: AnalyzeResult | null = null;
  let evaluation: Evaluation | null = null;
  if (speaker === "customer") {
    const policy = await store.getPolicy(orgId);
    analysis = await analyzeUtterance(text, policy);
    await store.patchCase(orgId, s.case_id, {
      latest_risk: {
        risk_level: analysis.risk_level,
        anger_level: analysis.anger_level,
        complaint_type: analysis.complaint_type,
        detected_risks: analysis.detected_risks,
        supervisor_report_required: analysis.supervisor_report_required,
        approval_required: analysis.approval_required,
      },
      status: "in_progress",
    });
    await store.appendAudit(orgId, {
      case_id: s.case_id,
      actor: "ai",
      action: "ai.analyze",
      detail: { risk_level: analysis.risk_level, detected_risks: analysis.detected_risks },
    });
  } else if (speaker === "operator") {
    const policy = await store.getPolicy(orgId);
    evaluation = evaluateAgent(text, policy);
    await store.appendAudit(orgId, {
      case_id: s.case_id,
      actor: "ai",
      action: "operator.evaluate",
      detail: { status: evaluation.status, issues: evaluation.issues.length },
    });
  }
  await store.appendAudit(orgId, { case_id: s.case_id, actor: speaker, action: "conversation.add", detail: { event_id: ev.id } });

  ok(res, { event: ev, analysis, evaluation }, 201);
});
