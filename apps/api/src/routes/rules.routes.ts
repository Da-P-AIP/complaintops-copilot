import { Router } from "express";
import type { KnowledgeRule } from "@complaintops/shared";
import { getStore } from "../db/store";
import { ok, fail } from "../utils/response";

export const rulesRouter = Router();

// GET /api/rules?status=candidate|approved|archived
rulesRouter.get("/", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const status = (req.query?.status as KnowledgeRule["status"] | undefined) || undefined;
  ok(res, await getStore().listRules(orgId, status));
});

// POST /api/rules/:id/approve — 候補を承認（昇格）
rulesRouter.post("/:id/approve", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const r = await store.setRuleStatus(orgId, req.params.id, "approved", "admin");
  if (!r) return fail(res, "NOT_FOUND", "ルールが見つかりません", 404);
  await store.appendAudit(orgId, { case_id: null, actor: "admin", action: "knowledge.approve", detail: { rule_id: r.id } });
  ok(res, r);
});

// POST /api/rules/:id/reject — 候補を却下（アーカイブ）
rulesRouter.post("/:id/reject", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const store = getStore();
  const r = await store.setRuleStatus(orgId, req.params.id, "archived", "admin");
  if (!r) return fail(res, "NOT_FOUND", "ルールが見つかりません", 404);
  await store.appendAudit(orgId, { case_id: null, actor: "admin", action: "knowledge.reject", detail: { rule_id: r.id } });
  ok(res, r);
});
