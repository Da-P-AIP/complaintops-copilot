import { Router } from "express";
import type { ConversationEvent, Speaker, AnalyzeResult, Evaluation, RiskResult } from "@complaintops/shared";
import { getStore, genId } from "../db/store";
import { ok, fail } from "../utils/response";
import { analyzeUtterance } from "../orchestrator/ComplaintOpsOrchestrator";
import { evaluateAgent } from "../agents/evaluateAgent";
import { evaluateFlow, fallbackCustomerReaction } from "../agents/flowAgent";
import { geminiCustomerTurn } from "../agents/geminiClient";
import { resolveProfile } from "../domain/industryProfiles";

export const sessionsRouter = Router();

function speakerJP(s: string): string {
  return s === "customer" ? "顧客" : s === "operator" ? "担当者" : "システム";
}
function buildHistory(events: ConversationEvent[]): string {
  return events.map((e) => `${speakerJP(e.speaker)}: ${e.text}`).join("\n");
}
function riskOf(a: AnalyzeResult): RiskResult {
  return {
    risk_level: a.risk_level,
    anger_level: a.anger_level,
    complaint_type: a.complaint_type,
    detected_risks: a.detected_risks,
    supervisor_report_required: a.supervisor_report_required,
    approval_required: a.approval_required,
  };
}

// POST /api/sessions/:sessionId/events
sessionsRouter.post("/:sessionId/events", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const s = await store.getSession(orgId, req.params.sessionId);
  if (!s) return fail(res, "NOT_FOUND", "セッションが見つかりません", 404);

  const text = (req.body?.text ?? "").toString();
  if (!text.trim()) return fail(res, "VALIDATION_ERROR", "text は必須です");

  const speaker: Speaker = (req.body?.speaker as Speaker) || "customer";
  const prior = await store.listEvents(orgId, s.case_id);
  const ev: ConversationEvent = { id: genId("evt"), session_id: s.id, case_id: s.case_id, speaker, text, created_at: new Date().toISOString() };
  await store.addEvent(orgId, ev);

  const all = [...prior, ev];
  const flow = evaluateFlow(all);

  let analysis: AnalyzeResult | null = null;
  let evaluation: Evaluation | null = null;
  if (speaker === "customer") {
    const basePolicy = await store.getPolicy(orgId);
    const overrideInd = (req.body?.industry_id ?? "").toString();
    const baseP = overrideInd ? { ...basePolicy, industry_id: overrideInd } : basePolicy;
    const approved = await store.listRules(orgId, "approved");
    const applicable = approved.filter((r) => !r.industry_id || r.industry_id === baseP.industry_id).slice(0, 3);
    const policy = applicable.length > 0 ? { ...baseP, learned_rules: applicable } : baseP;
    analysis = await analyzeUtterance(text, policy, buildHistory(all), flow.next_stage);
    if (applicable.length > 0) await store.bumpRuleUse(orgId, applicable.map((r) => r.id));
    await store.patchCase(orgId, s.case_id, { latest_risk: riskOf(analysis), status: "in_progress" });
    await store.appendAudit(orgId, { case_id: s.case_id, actor: "ai", action: "ai.analyze", detail: { risk_level: analysis.risk_level, detected_risks: analysis.detected_risks } });
  } else if (speaker === "operator") {
    const policy = await store.getPolicy(orgId);
    evaluation = evaluateAgent(text, policy);
    await store.appendAudit(orgId, { case_id: s.case_id, actor: "ai", action: "operator.evaluate", detail: { status: evaluation.status, issues: evaluation.issues.length } });
  }
  await store.appendAudit(orgId, { case_id: s.case_id, actor: speaker, action: "conversation.add", detail: { event_id: ev.id } });

  ok(res, { event: ev, analysis, evaluation, flow }, 201);
});

// POST /api/sessions/:sessionId/customer-turn — クレーム客が対応フローに応じて反応する
sessionsRouter.post("/:sessionId/customer-turn", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const s = await store.getSession(orgId, req.params.sessionId);
  if (!s) return fail(res, "NOT_FOUND", "セッションが見つかりません", 404);

  const prior = await store.listEvents(orgId, s.case_id);
  const priorFlow = evaluateFlow(prior);
  const basePolicy = await store.getPolicy(orgId);
  const overrideInd = (req.body?.industry_id ?? "").toString();
  const industryId = overrideInd || basePolicy.industry_id;
  const profile = resolveProfile(industryId, basePolicy);

  let line: string;
  let resolved = false;
  let source: "gemini" | "flow" | "fallback" = "fallback";

  if (priorFlow.all_done) {
    const r = fallbackCustomerReaction(prior, profile);
    line = r.line;
    resolved = true;
    source = "flow";
  } else if (process.env.AI_MODE === "gemini" && process.env.GEMINI_API_KEY) {
    try {
      line = await geminiCustomerTurn(buildHistory(prior), profile);
      source = "gemini";
    } catch {
      line = fallbackCustomerReaction(prior, profile).line;
    }
  } else {
    line = fallbackCustomerReaction(prior, profile).line;
  }

  const ev: ConversationEvent = { id: genId("evt"), session_id: s.id, case_id: s.case_id, speaker: "customer", text: line, created_at: new Date().toISOString() };
  await store.addEvent(orgId, ev);

  const all = [...prior, ev];
  const flow = evaluateFlow(all);
  const baseP = overrideInd ? { ...basePolicy, industry_id: overrideInd } : basePolicy;
  const approved = await store.listRules(orgId, "approved");
  const applicable = approved.filter((r) => !r.industry_id || r.industry_id === baseP.industry_id).slice(0, 3);
  const policy = applicable.length > 0 ? { ...baseP, learned_rules: applicable } : baseP;
  const analysis = await analyzeUtterance(line, policy, buildHistory(all), flow.next_stage);
  await store.patchCase(orgId, s.case_id, { latest_risk: riskOf(analysis), status: resolved ? "resolved_pending_close" : "in_progress" });
  await store.appendAudit(orgId, { case_id: s.case_id, actor: "customer", action: "customer.turn", detail: { source, resolved } });

  ok(res, { event: ev, analysis, flow, resolved, source }, 201);
});
