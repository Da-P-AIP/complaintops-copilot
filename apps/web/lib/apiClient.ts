import type {
  AnalyzeResult,
  ComplaintCase,
  Session,
  ConversationEvent,
  CompanyRules,
  JobTypesResponse,
  Scenario,
  InterviewOptions,
  Report,
  Resolutions,
  ClosureResult,
  AuditEvent,
  Evaluation,
  FlowState,
  KnowledgeRule,
} from "@/lib/types";
import { getIdToken } from "@/lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "APIエラー");
  return json.data as T;
}

export interface EventResult {
  event: ConversationEvent;
  analysis: AnalyzeResult | null;
  evaluation?: Evaluation | null;
  flow?: FlowState;
  resolved?: boolean;
  source?: string;
}

export const api = {
  getJobTypes: () => req<JobTypesResponse>("/api/job-types"),
  getInterviewOptions: (questionId: string, answers: Record<string, string>) =>
    req<InterviewOptions>("/api/setup/options", { method: "POST", body: JSON.stringify({ questionId, answers }) }),
  getSimulations: () => req<Scenario[]>("/api/simulations"),
  runSetupInterview: (params: { business_type: string; text: string; company_name?: string; industry_id?: string; operator_name?: string }) =>
    req<CompanyRules>("/api/setup/interview", { method: "POST", body: JSON.stringify(params) }),
  getActivePolicy: () => req<CompanyRules>("/api/setup/policies/active"),
  updatePolicy: (patch: { company_name?: string; operator_name?: string }) =>
    req<CompanyRules>("/api/setup/policy/update", { method: "POST", body: JSON.stringify(patch) }),
  listCases: () => req<ComplaintCase[]>("/api/cases"),
  listAudit: () => req<AuditEvent[]>("/api/audit"),
  createCase: () => req<ComplaintCase>("/api/cases", { method: "POST", body: JSON.stringify({ business_type: "EC" }) }),
  startSession: (caseId: string) =>
    req<Session>(`/api/cases/${caseId}/sessions`, { method: "POST", body: JSON.stringify({ channel: "text" }) }),
  getCase: (caseId: string) => req<ComplaintCase>(`/api/cases/${caseId}`),
  addEvent: (sessionId: string, text: string, industryId?: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, { method: "POST", body: JSON.stringify({ text, speaker: "customer", ...(industryId ? { industry_id: industryId } : {}) }) }),
  addOperatorEvent: (sessionId: string, text: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, { method: "POST", body: JSON.stringify({ text, speaker: "operator" }) }),
  customerTurn: (sessionId: string, industryId: string, industryLabel: string) =>
    req<EventResult & { source?: string }>(`/api/sessions/${sessionId}/customer-turn`, { method: "POST", body: JSON.stringify({ industry_id: industryId, industry_label: industryLabel }) }),
  saveReport: (caseId: string, markdown: string) =>
    req<{ saved: boolean }>(`/api/cases/${caseId}/report/save`, { method: "POST", body: JSON.stringify({ markdown }) }),
  generateReport: (caseId: string) =>
    req<Report>(`/api/cases/${caseId}/report`, { method: "POST", body: JSON.stringify({}) }),
  updateResolution: (caseId: string, key: string, value: boolean) =>
    req<Resolutions>(`/api/cases/${caseId}/resolutions`, { method: "POST", body: JSON.stringify({ key, value }) }),
  getClosure: (caseId: string) => req<ClosureResult>(`/api/cases/${caseId}/closure`),
  closeCase: (caseId: string) => req<{ status: string; learned: KnowledgeRule | null }>(`/api/cases/${caseId}/close`, { method: "POST", body: JSON.stringify({}) }),
  extractRule: (caseId: string) => req<KnowledgeRule>(`/api/cases/${caseId}/extract-rule`, { method: "POST", body: JSON.stringify({}) }),
  listRules: (status?: KnowledgeRule["status"]) => req<KnowledgeRule[]>(`/api/rules${status ? `?status=${status}` : ""}`),
  createRule: (input: { statement: string; category: string; industry_id?: string }) =>
    req<KnowledgeRule>("/api/rules", { method: "POST", body: JSON.stringify(input) }),
  approveRule: (id: string) => req<KnowledgeRule>(`/api/rules/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  rejectRule: (id: string) => req<KnowledgeRule>(`/api/rules/${id}/reject`, { method: "POST", body: JSON.stringify({}) }),
};
