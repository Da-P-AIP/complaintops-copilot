import express from "express";
import cors from "cors";
import { casesRouter } from "./routes/cases.routes";
import { sessionsRouter } from "./routes/sessions.routes";
import { setupRouter } from "./routes/setup.routes";
import { db } from "./db/mockDb";
import { ok } from "./utils/response";

const app = express();
app.use(cors());
app.use(express.json());

// ルートは案内ページ（審査員が直接開いても「Cannot GET /」を見せない）
app.get("/", (_req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html><html lang="ja"><meta charset="utf-8">
<title>ComplaintOps Copilot API</title>
<body style="font-family:system-ui,'Hiragino Sans',sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:48px;line-height:1.7">
  <h1 style="margin:0 0 8px">ComplaintOps Copilot <span style="color:#38bdf8">API</span></h1>
  <p style="color:#94a3b8;margin:0 0 24px">クレーム対応中の人間を守るAIエージェント（バックエンド）。画面UIはWebアプリ側です。</p>
  <p>稼働状況: <a style="color:#34d399" href="/health">/health</a></p>
  <p style="color:#94a3b8">主なエンドポイント: <code>POST /api/cases</code> → <code>POST /api/cases/:id/sessions</code> → <code>POST /api/sessions/:id/events</code> / 監査ログ <code>GET /api/audit</code></p>
</body></html>`);
});

app.get("/health", (_req, res) => ok(res, { status: "ok", service: "complaintops-api" }));

// 監査ログ閲覧（01 設計思想 7.9 / 改ざん検知デモ用）
app.get("/api/audit", (_req, res) => ok(res, db.audit));

app.use("/api", setupRouter);
app.use("/api/cases", casesRouter);
app.use("/api/sessions", sessionsRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[complaintops-api] listening on :${port}`);
});
