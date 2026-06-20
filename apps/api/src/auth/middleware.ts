import type { Request, Response, NextFunction } from "express";
import { getAdmin } from "./firebaseAdmin";

// req.orgId にテナントキー（= 認証uid もしくは dev時のフォールバック）を載せる
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      orgId?: string;
    }
  }
}

function unauthorized(res: Response) {
  return res.status(401).json({
    ok: false,
    error: { code: "AUTH_REQUIRED", message: "認証が必要です" },
    meta: { request_id: `req_${Date.now().toString(36)}`, timestamp: new Date().toISOString() },
  });
}

/**
 * 認証ミドルウェア。
 * - AUTH_REQUIRED=true：Firebase IDトークンを検証し、org_id = uid を確定（詐称不可）。失敗は401。
 * - それ以外（dev/メモリ）：x-org-id ヘッダ or "org_001" にフォールバック。
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authRequired = process.env.AUTH_REQUIRED === "true";
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token) {
    const a = getAdmin();
    if (a) {
      try {
        const decoded = await a.auth().verifyIdToken(token);
        req.orgId = decoded.uid;
        next();
        return;
      } catch {
        if (authRequired) {
          unauthorized(res);
          return;
        }
      }
    }
  }

  if (authRequired) {
    unauthorized(res);
    return;
  }

  // dev / メモリモードのフォールバック
  req.orgId = req.header("x-org-id") || "org_001";
  next();
}
