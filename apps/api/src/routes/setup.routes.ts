import { Router } from "express";
import { JOB_TEMPLATES, SETUP_EXAMPLES, SCENARIOS } from "@complaintops/shared";
import { setupAgent } from "../agents/setupAgent";
import { generateInterviewOptions } from "../agents/interviewAgent";
import { setActivePolicy, getActivePolicy, appendAudit } from "../db/mockDb";
import { ok } from "../utils/response";

export const setupRouter = Router();

// GET /api/job-types — 業種テンプレート一覧（+自然文サンプル）
setupRouter.get("/job-types", (_req, res) => {
  ok(res, { templates: JOB_TEMPLATES, examples: SETUP_EXAMPLES });
});

// POST /api/setup/options — 対話型ウィザードの選択肢（決定木 + 任意でGemini動的生成）
setupRouter.post("/setup/options", async (req, res) => {
  const questionId = (req.body?.questionId ?? "").toString();
  const answers = (req.body?.answers ?? {}) as Record<string, string>;
  const result = await generateInterviewOptions(questionId, answers);
  ok(res, result);
});

// GET /api/simulations — クレーム会話シミュレーションのシナリオ
setupRouter.get("/simulations", (_req, res) => {
  ok(res, SCENARIOS);
});

// POST /api/setup/interview — 自然文 → 会社ルール生成（active policyに保存）
setupRouter.post("/setup/interview", (req, res) => {
  const rules = setupAgent({
    business_type: req.body?.business_type,
    text: req.body?.text,
  });
  setActivePolicy(rules);
  appendAudit({
    org_id: "org_001",
    case_id: null,
    actor: "admin",
    action: "setup.policy_saved",
    detail: { business_type: rules.business_type, approval_required: rules.approval_required },
  });
  ok(res, rules, 201);
});

// GET /api/setup/policies/active — 現在の会社ルール
setupRouter.get("/setup/policies/active", (_req, res) => {
  ok(res, getActivePolicy());
});
