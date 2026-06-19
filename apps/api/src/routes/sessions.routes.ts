import { Router } from "express";
import type { ConversationEvent, Speaker, AnalyzeResult } from "@complaintops/shared";
import { db, genId, appendAudit } from "../db/mockDb";
import { ok, fail } from "../utils/response";
import { analyzeUtterance } from "../orchestrator/ComplaintOpsOrchestrator";

export const sessionsRouter = Router();

// POST /api/sessions/:sessionId/events — 発話を保存し、顧客発話ならAI判定を返す
sessionsRouter.post("/:sessionId/events", async (req, res) => {
  const s = db.sessions.get(req.params.sessionId);
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
  db.events.set(ev.id, ev);

  const c = db.cases.get(s.case_id);
  let analysis: AnalyzeResult | null = null;

  if (speaker === "customer") {
    analysis = await analyzeUtterance(text);
    if (c) {
      c.latest_risk = {
        risk_level: analysis.risk_level,
        anger_level: analysis.anger_level,
        complaint_type: analysis.complaint_type,
        detected_risks: analysis.detected_risks,
        supervisor_report_required: analysis.supervisor_report_required,
        approval_required: analysis.approval_required,
      };
      c.status = "in_progress";
      c.updated_at = ev.created_at;
    }
    appendAudit({
      org_id: c?.org_id ?? "org_001",
      case_id: s.case_id,
      actor: "ai",
      action: "ai.analyze",
      detail: { risk_level: analysis.risk_level, detected_risks: analysis.detected_risks },
    });
  }

  appendAudit({
    org_id: c?.org_id ?? "org_001",
    case_id: s.case_id,
    actor: speaker,
    action: "conversation.add",
    detail: { event_id: ev.id },
  });

  ok(res, { event: ev, analysis }, 201);
});
