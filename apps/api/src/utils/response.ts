import type { Response } from "express";

function meta() {
  return {
    request_id: `req_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
  };
}

export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ ok: true, data, meta: meta() });
}

export function fail(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details: unknown = {},
): void {
  res.status(status).json({ ok: false, error: { code, message, details }, meta: meta() });
}
