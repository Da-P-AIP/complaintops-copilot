import { createHash, randomBytes } from "node:crypto";
import type {
  ComplaintCase,
  Session,
  ConversationEvent,
  AuditEvent,
  CompanyRules,
  KnowledgeRule,
} from "@complaintops/shared";
import { DEFAULT_COMPANY_RULES } from "@complaintops/shared";
import { getAdmin } from "../auth/firebaseAdmin";

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
}

function hashAudit(input: object): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export interface AuditInput {
  case_id: string | null;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
}

/** 組織(org)単位でスコープされたデータアクセス層 */
export interface Store {
  createCase(orgId: string, input: Partial<ComplaintCase>): Promise<ComplaintCase>;
  getCase(orgId: string, caseId: string): Promise<ComplaintCase | null>;
  listCases(orgId: string): Promise<ComplaintCase[]>;
  patchCase(orgId: string, caseId: string, patch: Partial<ComplaintCase>): Promise<ComplaintCase | null>;
  createSession(orgId: string, caseId: string, channel: string): Promise<Session>;
  getSession(orgId: string, sessionId: string): Promise<Session | null>;
  addEvent(orgId: string, ev: ConversationEvent): Promise<void>;
  listEvents(orgId: string, caseId: string): Promise<ConversationEvent[]>;
  getPolicy(orgId: string): Promise<CompanyRules>;
  setPolicy(orgId: string, rules: CompanyRules): Promise<void>;
  appendAudit(orgId: string, input: AuditInput): Promise<AuditEvent>;
  listAudit(orgId: string): Promise<AuditEvent[]>;
  listRules(orgId: string, status?: KnowledgeRule["status"]): Promise<KnowledgeRule[]>;
  addRule(orgId: string, rule: KnowledgeRule): Promise<void>;
  setRuleStatus(orgId: string, id: string, status: KnowledgeRule["status"], approver?: string): Promise<KnowledgeRule | null>;
  bumpRuleUse(orgId: string, ids: string[]): Promise<void>;
}

function newCase(orgId: string, input: Partial<ComplaintCase>): ComplaintCase {
  const now = new Date().toISOString();
  return {
    id: genId("case"),
    org_id: orgId,
    location_id: input.location_id || "loc_001",
    operator_id: input.operator_id || "user_001",
    customer_ref: input.customer_ref || "anonymous",
    job_type_id: input.job_type_id ?? null,
    case_type: input.case_type || "complaint",
    status: "new",
    created_at: now,
    updated_at: now,
  };
}

function buildAudit(orgId: string, input: AuditInput, prev_hash: string): AuditEvent {
  const created_at = new Date().toISOString();
  const id = genId("audit");
  const base = { id, org_id: orgId, ...input, prev_hash, created_at };
  const event_hash = hashAudit(base);
  return { ...base, event_hash };
}

// ---- メモリ実装（dev / フォールバック） ----
interface OrgData {
  cases: Map<string, ComplaintCase>;
  sessions: Map<string, Session>;
  events: ConversationEvent[];
  audit: AuditEvent[];
  policy: CompanyRules;
  caseSeq: number;
  rules: KnowledgeRule[];
}

class MemoryStore implements Store {
  private orgs = new Map<string, OrgData>();
  private org(orgId: string): OrgData {
    let o = this.orgs.get(orgId);
    if (!o) {
      o = { cases: new Map(), sessions: new Map(), events: [], audit: [], policy: DEFAULT_COMPANY_RULES, caseSeq: 0, rules: [] };
      this.orgs.set(orgId, o);
    }
    return o;
  }
  async createCase(orgId: string, input: Partial<ComplaintCase>) {
    const o = this.org(orgId);
    o.caseSeq += 1;
    const c = newCase(orgId, input);
    c.case_no = o.caseSeq;
    o.cases.set(c.id, c);
    return c;
  }
  async getCase(orgId: string, caseId: string) {
    return this.org(orgId).cases.get(caseId) ?? null;
  }
  async listCases(orgId: string) {
    return Array.from(this.org(orgId).cases.values());
  }
  async patchCase(orgId: string, caseId: string, patch: Partial<ComplaintCase>) {
    const c = this.org(orgId).cases.get(caseId);
    if (!c) return null;
    Object.assign(c, patch, { updated_at: new Date().toISOString() });
    return c;
  }
  async createSession(orgId: string, caseId: string, channel: string) {
    const s: Session = { id: genId("sess"), case_id: caseId, channel, started_at: new Date().toISOString() };
    this.org(orgId).sessions.set(s.id, s);
    return s;
  }
  async getSession(orgId: string, sessionId: string) {
    return this.org(orgId).sessions.get(sessionId) ?? null;
  }
  async addEvent(orgId: string, ev: ConversationEvent) {
    this.org(orgId).events.push(ev);
  }
  async listEvents(orgId: string, caseId: string) {
    return this.org(orgId).events.filter((e) => e.case_id === caseId);
  }
  async getPolicy(orgId: string) {
    return this.org(orgId).policy;
  }
  async setPolicy(orgId: string, rules: CompanyRules) {
    this.org(orgId).policy = rules;
  }
  async appendAudit(orgId: string, input: AuditInput) {
    const o = this.org(orgId);
    const prev = o.audit.length > 0 ? o.audit[o.audit.length - 1]!.event_hash : "GENESIS";
    const ev = buildAudit(orgId, input, prev);
    o.audit.push(ev);
    return ev;
  }
  async listAudit(orgId: string) {
    return this.org(orgId).audit;
  }
  async listRules(orgId: string, status?: KnowledgeRule["status"]) {
    const all = this.org(orgId).rules;
    return status ? all.filter((r) => r.status === status) : all;
  }
  async addRule(orgId: string, rule: KnowledgeRule) {
    this.org(orgId).rules.push(rule);
  }
  async setRuleStatus(orgId: string, id: string, status: KnowledgeRule["status"], approver?: string) {
    const r = this.org(orgId).rules.find((x) => x.id === id);
    if (!r) return null;
    r.status = status;
    if (approver) r.approved_by = approver;
    return r;
  }
  async bumpRuleUse(orgId: string, ids: string[]) {
    for (const r of this.org(orgId).rules) if (ids.includes(r.id)) r.use_count += 1;
  }
}

// ---- Firestore 実装（本番 / org分離・永続化） ----
class FirestoreStore implements Store {
  private get fs() {
    const a = getAdmin();
    if (!a) throw new Error("firebase-admin not initialized");
    return a.firestore();
  }
  private org(orgId: string) {
    return this.fs.collection("organizations").doc(orgId);
  }
  async createCase(orgId: string, input: Partial<ComplaintCase>) {
    const orgRef = this.org(orgId);
    const c = newCase(orgId, input);
    c.case_no = await this.fs.runTransaction(async (tx) => {
      const d = await tx.get(orgRef);
      const cur = ((d.data() as { case_seq?: number } | undefined)?.case_seq ?? 0) + 1;
      tx.set(orgRef, { case_seq: cur }, { merge: true });
      return cur;
    });
    await orgRef.collection("cases").doc(c.id).set(c);
    return c;
  }
  async getCase(orgId: string, caseId: string) {
    const d = await this.org(orgId).collection("cases").doc(caseId).get();
    return d.exists ? (d.data() as ComplaintCase) : null;
  }
  async listCases(orgId: string) {
    const q = await this.org(orgId).collection("cases").get();
    return q.docs.map((d) => d.data() as ComplaintCase);
  }
  async patchCase(orgId: string, caseId: string, patch: Partial<ComplaintCase>) {
    const ref = this.org(orgId).collection("cases").doc(caseId);
    const d = await ref.get();
    if (!d.exists) return null;
    const updated = { ...patch, updated_at: new Date().toISOString() };
    await ref.set(updated, { merge: true });
    return { ...(d.data() as ComplaintCase), ...updated };
  }
  async createSession(orgId: string, caseId: string, channel: string) {
    const s: Session = { id: genId("sess"), case_id: caseId, channel, started_at: new Date().toISOString() };
    await this.org(orgId).collection("sessions").doc(s.id).set(s);
    return s;
  }
  async getSession(orgId: string, sessionId: string) {
    const d = await this.org(orgId).collection("sessions").doc(sessionId).get();
    return d.exists ? (d.data() as Session) : null;
  }
  async addEvent(orgId: string, ev: ConversationEvent) {
    await this.org(orgId).collection("cases").doc(ev.case_id).collection("events").doc(ev.id).set(ev);
  }
  async listEvents(orgId: string, caseId: string) {
    const q = await this.org(orgId).collection("cases").doc(caseId).collection("events").orderBy("created_at").get();
    return q.docs.map((d) => d.data() as ConversationEvent);
  }
  async getPolicy(orgId: string) {
    const d = await this.org(orgId).get();
    const data = d.data() as { policy?: CompanyRules } | undefined;
    return data?.policy ?? DEFAULT_COMPANY_RULES;
  }
  async setPolicy(orgId: string, rules: CompanyRules) {
    await this.org(orgId).set({ policy: rules }, { merge: true });
  }
  async appendAudit(orgId: string, input: AuditInput) {
    const col = this.org(orgId).collection("audit");
    const last = await col.orderBy("created_at", "desc").limit(1).get();
    const prev = last.empty ? "GENESIS" : (last.docs[0]!.data() as AuditEvent).event_hash;
    const ev = buildAudit(orgId, input, prev);
    await col.doc(ev.id).set(ev);
    return ev;
  }
  async listAudit(orgId: string) {
    const q = await this.org(orgId).collection("audit").orderBy("created_at").get();
    return q.docs.map((d) => d.data() as AuditEvent);
  }
  async listRules(orgId: string, status?: KnowledgeRule["status"]) {
    const col = this.org(orgId).collection("rules");
    const q = status ? await col.where("status", "==", status).get() : await col.get();
    return q.docs.map((d) => d.data() as KnowledgeRule);
  }
  async addRule(orgId: string, rule: KnowledgeRule) {
    await this.org(orgId).collection("rules").doc(rule.id).set(rule);
  }
  async setRuleStatus(orgId: string, id: string, status: KnowledgeRule["status"], approver?: string) {
    const ref = this.org(orgId).collection("rules").doc(id);
    const d = await ref.get();
    if (!d.exists) return null;
    const patch: Partial<KnowledgeRule> = { status };
    if (approver) patch.approved_by = approver;
    await ref.set(patch, { merge: true });
    return { ...(d.data() as KnowledgeRule), ...patch };
  }
  async bumpRuleUse(orgId: string, ids: string[]) {
    await Promise.all(
      ids.map(async (id) => {
        const ref = this.org(orgId).collection("rules").doc(id);
        const d = await ref.get();
        if (d.exists) await ref.set({ use_count: ((d.data() as KnowledgeRule).use_count ?? 0) + 1 }, { merge: true });
      }),
    );
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) {
    store = process.env.USE_FIRESTORE === "true" ? new FirestoreStore() : new MemoryStore();
  }
  return store;
}
