import { Router } from "express";
import { JOB_TEMPLATES, SETUP_EXAMPLES, SCENARIOS } from "@complaintops/shared";
import { setupAgent } from "../agents/setupAgent";
import { generateInterviewOptions } from "../agents/interviewAgent";
import { getStore } from "../db/store";
import { ok } from "../utils/response";

export const setupRouter = Router();

// GET /api/job-types
setupRouter.get("/job-types", (_req, res) => {
  ok(res, { templates: JOB_TEMPLATES, examples: SETUP_EXAMPLES });
});

// POST /api/setup/options
setupRouter.post("/setup/options", async (req, res) => {
  const questionId = (req.body?.questionId ?? "").toString();
  const answers = (req.body?.answers ?? {}) as Record<string, string>;
  ok(res, await generateInterviewOptions(questionId, answers));
});

// GET /api/simulations
setupRouter.get("/simulations", (_req, res) => {
  ok(res, SCENARIOS);
});

// POST /api/setup/interview — 会社ルール生成→org配下に保存
setupRouter.post("/setup/interview", async (req, res) => {
  const orgId = req.orgId || "org_001";
  const rules = setupAgent({ business_type: req.body?.business_type, text: req.body?.text });
  const store = getStore();
  await store.setPolicy(orgId, rules);
  await store.appendAudit(orgId, {
    case_id: null,
    actor: "admin",
    action: "setup.policy_saved",
    detail: { business_type: rules.business_type, approval_required: rules.approval_required },
  });
  ok(res, rules, 201);
});

// GET /api/setup/policies/active
setupRouter.get("/setup/policies/active", async (req, res) => {
  ok(res, await getStore().getPolicy(req.orgId || "org_001"));
});
