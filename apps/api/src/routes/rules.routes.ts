import { Router } from "express";
import type { KnowledgeRule } from "@complaintops/shared";
import { getStore, genId } from "../db/store";
import { ok, fail } from "../utils/response";

export const rulesRouter = Router();

// GET /api/rules?status=candidate|approved|archived
rulesRouter.get("/", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const status = (req.query?.status as KnowledgeRule["status"] | undefined) || undefined;
  ok(res, await getStore().listRules(orgId, status));
});

// POST /api/rules — 社内ルールを手動で追加（管理者が直接設定。承認済みとして登録）
rulesRouter.post("/", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const statement = (req.body?.statement ?? "").toString().trim();
  if (!statement) return fail(res, "VALIDATION_ERROR", "statement は必須です");
  const store = getStore();
  const rule: KnowledgeRule = {
    id: genId("rule"),
    org_id: orgId,
    category: (req.body?.category ?? "その他").toString(),
    industry_id: (req.body?.industry_id ?? "").toString() || undefined,
    statement,
    rationale: (req.body?.rationale ?? "管理者が手動で追加").toString(),
    status: "approved",
    use_count: 0,
    created_at: new Date().toISOString(),
    approved_by: "admin",
  };
  await store.addRule(orgId, rule);
  await store.appendAudit(orgId, { case_id: null, actor: "admin", action: "knowledge.manual_add", detail: { rule_id: rule.id } });
  ok(res, rule, 201);
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
