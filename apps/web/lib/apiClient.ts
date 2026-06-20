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
}

export const api = {
  getJobTypes: () => req<JobTypesResponse>("/api/job-types"),
  getInterviewOptions: (questionId: string, answers: Record<string, string>) =>
    req<InterviewOptions>("/api/setup/options", { method: "POST", body: JSON.stringify({ questionId, answers }) }),
  getSimulations: () => req<Scenario[]>("/api/simulations"),
  runSetupInterview: (params: { business_type: string; text: string; company_name?: string; industry_id?: string; operator_name?: string }) =>
    req<CompanyRules>("/api/setup/interview", { method: "POST", body: JSON.stringify(params) }),
  getActivePolicy: () => req<CompanyRules>("/api/setup/policies/active"),
  listCases: () => req<ComplaintCase[]>("/api/cases"),
  listAudit: () => req<AuditEvent[]>("/api/audit"),
  createCase: () => req<ComplaintCase>("/api/cases", { method: "POST", body: JSON.stringify({ business_type: "EC" }) }),
  startSession: (caseId: string) =>
    req<Session>(`/api/cases/${caseId}/sessions`, { method: "POST", body: JSON.stringify({ channel: "text" }) }),
  getCase: (caseId: string) => req<ComplaintCase>(`/api/cases/${caseId}`),
  addEvent: (sessionId: string, text: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, { method: "POST", body: JSON.stringify({ text, speaker: "customer" }) }),
  addOperatorEvent: (sessionId: string, text: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, { method: "POST", body: JSON.stringify({ text, speaker: "operator" }) }),
  saveReport: (caseId: string, markdown: string) =>
    req<{ saved: boolean }>(`/api/cases/${caseId}/report/save`, { method: "POST", body: JSON.stringify({ markdown }) }),
  generateReport: (caseId: string) =>
    req<Report>(`/api/cases/${caseId}/report`, { method: "POST", body: JSON.stringify({}) }),
  updateResolution: (caseId: string, key: string, value: boolean) =>
    req<Resolutions>(`/api/cases/${caseId}/resolutions`, { method: "POST", body: JSON.stringify({ key, value }) }),
  getClosure: (caseId: string) => req<ClosureResult>(`/api/cases/${caseId}/closure`),
  closeCase: (caseId: string) => req<{ status: string }>(`/api/cases/${caseId}/close`, { method: "POST", body: JSON.stringify({}) }),
};
