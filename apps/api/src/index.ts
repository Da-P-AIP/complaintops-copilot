import express from "express";
import cors from "cors";
import { casesRouter } from "./routes/cases.routes";
import { sessionsRouter } from "./routes/sessions.routes";
import { db } from "./db/mockDb";
import { ok } from "./utils/response";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => ok(res, { status: "ok", service: "complaintops-api" }));

// 監査ログ閲覧（01 設計思想 7.9 / 改ざん検知デモ用）
app.get("/api/audit", (_req, res) => ok(res, db.audit));

app.use("/api/cases", casesRouter);
app.use("/api/sessions", sessionsRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[complaintops-api] listening on :${port}`);
});
