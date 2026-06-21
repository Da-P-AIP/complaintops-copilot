import { Router } from "express";
import { getStore } from "../db/store";
import { ok, fail } from "../utils/response";
import { reportAgent } from "../agents/reportAgent";
import { closureGate } from "../agents/closureGate";
import { buildRuleCandidate } from "../agents/knowledgeAgent";
import { resolveProfile } from "../domain/industryProfiles";
import type { ComplaintCase } from "@complaintops/shared";

export const casesRouter = Router();

const RESOLUTION_KEYS = ["supervisor_reported", "approved", "evidence_checked", "customer_replied"] as const;

// 案件の会話・報告書から社内ルール候補を抽出して保存（暗黙知サイクルの「連結化」）
async function extractAndSaveRule(orgId: string, c: ComplaintCase) {
  const store = getStore();
  const events = await store.listEvents(orgId, c.id);
  const history = events
    .map((e) => `${e.speaker === "customer" ? "顧客" : e.speaker === "operator" ? "担当者" : "システム"}: ${e.text}`)
    .join("\n");
  const policy = await store.getPolicy(orgId);
  const profile = resolveProfile(policy.industry_id, policy);
  const rule = await buildRuleCandidate({
    orgId,
    history,
    report: c.report?.markdown ?? "",
    profile,
    caseNo: c.case_no,
    industryId: policy.industry_id,
  });
  await store.addRule(orgId, rule);
  await store.appendAudit(orgId, { case_id: c.id, actor: "ai", action: "knowledge.extract", detail: { rule_id: rule.id, category: rule.category } });
  return rule;
}

// POST /api/cases
casesRouter.post("/", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const body = req.body ?? {};
  const store = getStore();
  const c = await store.createCase(orgId, {
    location_id: body.location_id,
    operator_id: req.header("x-user-id") || body.operator_id,
    customer_ref: body.customer_ref,
    job_type_id: body.job_type_id ?? null,
    case_type: body.case_type,
  });
  await store.appendAudit(orgId, { case_id: c.id, actor: c.operator_id, action: "case.create", detail: { case_type: c.case_type } });
  ok(res, c, 201);
});

// GET /api/cases
casesRouter.get("/", async (req, res) => {
  ok(res, await getStore().listCases(req.orgId || "org_001"));
});

// GET /api/cases/:caseId
casesRouter.get("/:caseId", async (req, res) => {
  const c = await getStore().getCase(req.orgId || "org_001", req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  ok(res, c);
});

// GET /api/cases/:caseId/events
casesRouter.get("/:caseId/events", async (req, res) => {
  ok(res, await getStore().listEvents(req.orgId || "org_001", req.params.caseId));
});

// POST /api/cases/:caseId/report
casesRouter.post("/:caseId/report", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const c = await store.getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const events = await store.listEvents(orgId, c.id);
  const report = reportAgent(c, events);
  await store.patchCase(orgId, c.id, { report });
  await store.appendAudit(orgId, { case_id: c.id, actor: "ai", action: "report.generate", detail: {} });
  ok(res, report, 201);
});

// POST /api/cases/:caseId/report/save — 編集した報告書を保存（再編集可能な書類）
casesRouter.post("/:caseId/report/save", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const c = await store.getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const markdown = (req.body?.markdown ?? "").toString();
  if (!markdown.trim()) return fail(res, "VALIDATION_ERROR", "markdown は必須です");
  await store.patchCase(orgId, c.id, { report: { generated_at: new Date().toISOString(), markdown } });
  await store.appendAudit(orgId, { case_id: c.id, actor: "operator", action: "report.save", detail: {} });
  ok(res, { saved: true });
});

// POST /api/cases/:caseId/resolutions
casesRouter.post("/:caseId/resolutions", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const c = await store.getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const key = (req.body?.key ?? "").toString();
  const value = req.body?.value === true;
  if (!(RESOLUTION_KEYS as readonly string[]).includes(key)) {
    return fail(res, "VALIDATION_ERROR", "不正なkeyです");
  }
  const resolutions = { ...(c.resolutions ?? {}), [key]: value };
  await store.patchCase(orgId, c.id, { resolutions });
  await store.appendAudit(orgId, { case_id: c.id, actor: "operator", action: "resolution.update", detail: { key, value } });
  ok(res, resolutions);
});

// GET /api/cases/:caseId/closure
casesRouter.get("/:caseId/closure", async (req, res) => {
  const c = await getStore().getCase(req.orgId || "org_001", req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  ok(res, closureGate(c));
});

// POST /api/cases/:caseId/close
casesRouter.post("/:caseId/close", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const c = await store.getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const result = closureGate(c);
  if (result.closure_status !== "closeable") {
    return fail(res, "APPROVAL_REQUIRED", "クローズ条件を満たしていません", 409, result);
  }
  await store.patchCase(orgId, c.id, { status: "closed" });
  await store.appendAudit(orgId, { case_id: c.id, actor: "operator", action: "case.close", detail: {} });
  let learned = null;
  try {
    learned = await extractAndSaveRule(orgId, c);
  } catch {
    learned = null;
  }
  ok(res, { status: "closed", learned });
});

// POST /api/cases/:caseId/extract-rule — この対応から社内ルール候補を抽出
casesRouter.post("/:caseId/extract-rule", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const c = await getStore().getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const rule = await extractAndSaveRule(orgId, c);
  ok(res, rule, 201);
});

// POST /api/cases/:caseId/sessions
casesRouter.post("/:caseId/sessions", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const c = await store.getCase(orgId, req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const s = await store.createSession(orgId, c.id, (req.body?.channel as string) || "text");
  await store.appendAudit(orgId, { case_id: c.id, actor: c.operator_id, action: "session.start", detail: { session_id: s.id } });
  ok(res, s, 201);
});
