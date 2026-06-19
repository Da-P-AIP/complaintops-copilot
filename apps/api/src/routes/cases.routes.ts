import { Router } from "express";
import type { ComplaintCase, Session } from "@complaintops/shared";
import { db, genId, appendAudit } from "../db/mockDb";
import { ok, fail } from "../utils/response";

export const casesRouter = Router();

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
