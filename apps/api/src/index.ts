import express from "express";
import cors from "cors";
import { casesRouter } from "./routes/cases.routes";
import { sessionsRouter } from "./routes/sessions.routes";
import { setupRouter } from "./routes/setup.routes";
import { authMiddleware } from "./auth/middleware";
import { getStore } from "./db/store";
import { ok } from "./utils/response";

const app = express();
app.use(cors());
app.use(express.json());

// 公開（認証不要）
app.get("/", (_req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>ComplaintOps Copilot API</title><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:48px"><h1>ComplaintOps Copilot API</h1><p><a href="/health" style="color:#34d399">/health</a></p></body></html>`);
});
app.get("/health", (_req, res) =>
  ok(res, {
    status: "ok",
    service: "complaintops-api",
    ai_mode: process.env.AI_MODE ?? null,
    gemini_active: process.env.AI_MODE === "gemini" && !!process.env.GEMINI_API_KEY,
    use_firestore: process.env.USE_FIRESTORE === "true",
    auth_required: process.env.AUTH_REQUIRED === "true",
  })
);

// /api 配下は認証ミドルウェア（AUTH_REQUIRED時はトークン検証、それ以外はフォールバック）
app.use("/api", authMiddleware);

app.get("/api/audit", async (req, res) => ok(res, await getStore().listAudit(req.orgId || "org_001")));
app.use("/api", setupRouter);
app.use("/api/cases", casesRouter);
app.use("/api/sessions", sessionsRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[complaintops-api] listening on :${port} (auth=${process.env.AUTH_REQUIRED === "true"}, firestore=${process.env.USE_FIRESTORE === "true"})`);
});
