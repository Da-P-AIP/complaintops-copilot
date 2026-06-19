import { createHash } from "node:crypto";
import type {
  ComplaintCase,
  Session,
  ConversationEvent,
  AuditEvent,
  CompanyRules,
} from "@complaintops/shared";
import { DEFAULT_COMPANY_RULES } from "@complaintops/shared";

// MVP: インメモリ Map。後で Firestore に差し替え可能なように最小の窓口だけ用意する。
export const db = {
  cases: new Map<string, ComplaintCase>(),
  sessions: new Map<string, Session>(),
  events: new Map<string, ConversationEvent>(),
  audit: [] as AuditEvent[],
};

// 初期設定で生成された会社ルール（手続き的記憶 / active policy）
let activePolicy: CompanyRules = DEFAULT_COMPANY_RULES;
export function getActivePolicy(): CompanyRules {
  return activePolicy;
}
export function setActivePolicy(rules: CompanyRules): void {
  activePolicy = rules;
}

let counter = 0;
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}`;
}

// 01 設計思想 7.9 / 04 DB設計 3.8: prev_hash → event_hash の軽量監査チェーン
export function appendAudit(input: {
  org_id: string;
  case_id: string | null;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
}): AuditEvent {
  const prev_hash =
    db.audit.length > 0 ? db.audit[db.audit.length - 1]!.event_hash : "GENESIS";
  const created_at = new Date().toISOString();
  const id = genId("audit");
  const payload = JSON.stringify({ id, ...input, prev_hash, created_at });
  const event_hash = createHash("sha256").update(payload).digest("hex");
  const ev: AuditEvent = { id, ...input, prev_hash, event_hash, created_at };
  db.audit.push(ev);
  return ev;
}
