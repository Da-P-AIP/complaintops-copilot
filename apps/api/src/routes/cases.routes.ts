import { Router } from "express";
import type { ComplaintCase, Session } from "@complaintops/shared";
import { db, genId, appendAudit } from "../db/mockDb";
import { ok, fail } from "../utils/response";
import { reportAgent } from "../agents/reportAgent";
import { closureGate } from "../agents/closureGate";

export const casesRouter = Router();

const RESOLUTION_KEYS = ["supervisor_reported", "approved", "evidence_checked", "customer_replied"] as const;

// POST /api/cases — 案件作成
casesRouter.post("/", (req, res) => {
  const now = new Date().toISOString();
  const body = req.body ?? {};
  const org_id = (req.header("x-org-id") || body.org_id || "org_001") as string;
  const operator_id = (req.header("x-user-id") || body.operator_id || "user_001") as string;

  const c: ComplaintCase = {
    id: genId("case"),
    org_id,
    location_id: body.location_id || "loc_001",
    operator_id,
    customer_ref: body.customer_ref || "anonymous",
    job_type_id: body.job_type_id ?? null,
    case_type: body.case_type || "complaint",
    status: "new",
    created_at: now,
    updated_at: now,
  };
  db.cases.set(c.id, c);
  appendAudit({ org_id, case_id: c.id, actor: operator_id, action: "case.create", detail: { case_type: c.case_type } });
  ok(res, c, 201);
});

// GET /api/cases — 一覧
casesRouter.get("/", (_req, res) => {
  ok(res, Array.from(db.cases.values()));
});

// GET /api/cases/:caseId — 単一案件
casesRouter.get("/:caseId", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  ok(res, c);
});

// GET /api/cases/:caseId/events — 会話履歴
casesRouter.get("/:caseId/events", (req, res) => {
  const events = Array.from(db.events.values()).filter((e) => e.case_id === req.params.caseId);
  ok(res, events);
});

// POST /api/cases/:caseId/report — 報告書を生成して保存
casesRouter.post("/:caseId/report", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const events = Array.from(db.events.values()).filter((e) => e.case_id === c.id);
  const report = reportAgent(c, events);
  c.report = report;
  c.updated_at = new Date().toISOString();
  appendAudit({ org_id: c.org_id, case_id: c.id, actor: "ai", action: "report.generate", detail: {} });
  ok(res, report, 201);
});

// POST /api/cases/:caseId/resolutions — 残務・承認などの解消フラグ更新
casesRouter.post("/:caseId/resolutions", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const key = (req.body?.key ?? "").toString();
  const value = req.body?.value === true;
  if (!(RESOLUTION_KEYS as readonly string[]).includes(key)) {
    return fail(res, "VALIDATION_ERROR", "不正なkeyです");
  }
  c.resolutions = { ...(c.resolutions ?? {}), [key]: value };
  c.updated_at = new Date().toISOString();
  appendAudit({ org_id: c.org_id, case_id: c.id, actor: "operator", action: "resolution.update", detail: { key, value } });
  ok(res, c.resolutions);
});

// GET /api/cases/:caseId/closure — クローズ可否判定
casesRouter.get("/:caseId/closure", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  ok(res, closureGate(c));
});

// POST /api/cases/:caseId/close — クローズ実行（ゲート通過時のみ）
casesRouter.post("/:caseId/close", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const result = closureGate(c);
  if (result.closure_status !== "closeable") {
    return fail(res, "APPROVAL_REQUIRED", "クローズ条件を満たしていません", 409, result);
  }
  c.status = "closed";
  c.updated_at = new Date().toISOString();
  appendAudit({ org_id: c.org_id, case_id: c.id, actor: "operator", action: "case.close", detail: {} });
  ok(res, { status: c.status });
});

// POST /api/cases/:caseId/sessions — 対応セッション開始
casesRouter.post("/:caseId/sessions", (req, res) => {
  const c = db.cases.get(req.params.caseId);
  if (!c) return fail(res, "NOT_FOUND", "案件が見つかりません", 404);
  const s: Session = {
    id: genId("sess"),
    case_id: c.id,
    channel: (req.body?.channel as string) || "text",
    started_at: new Date().toISOString(),
  };
  db.sessions.set(s.id, s);
  appendAudit({ org_id: c.org_id, case_id: c.id, actor: c.operator_id, action: "session.start", detail: { session_id: s.id } });
  ok(res, s, 201);
});
