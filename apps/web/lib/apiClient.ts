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
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "APIエラー");
  return json.data as T;
}

export interface EventResult {
  event: ConversationEvent;
  analysis: AnalyzeResult | null;
}

export const api = {
  getJobTypes: () => req<JobTypesResponse>("/api/job-types"),
  getInterviewOptions: (questionId: string, answers: Record<string, string>) =>
    req<InterviewOptions>("/api/setup/options", {
      method: "POST",
      body: JSON.stringify({ questionId, answers }),
    }),
  getSimulations: () => req<Scenario[]>("/api/simulations"),
  runSetupInterview: (business_type: string, text: string) =>
    req<CompanyRules>("/api/setup/interview", {
      method: "POST",
      body: JSON.stringify({ business_type, text }),
    }),
  getActivePolicy: () => req<CompanyRules>("/api/setup/policies/active"),
  createCase: () => req<ComplaintCase>("/api/cases", { method: "POST", body: JSON.stringify({ business_type: "EC" }) }),
  startSession: (caseId: string) =>
    req<Session>(`/api/cases/${caseId}/sessions`, { method: "POST", body: JSON.stringify({ channel: "text" }) }),
  addEvent: (sessionId: string, text: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, {
      method: "POST",
      body: JSON.stringify({ text, speaker: "customer" }),
    }),
  generateReport: (caseId: string) =>
    req<Report>(`/api/cases/${caseId}/report`, { method: "POST", body: JSON.stringify({}) }),
  updateResolution: (caseId: string, key: string, value: boolean) =>
    req<Resolutions>(`/api/cases/${caseId}/resolutions`, { method: "POST", body: JSON.stringify({ key, value }) }),
  getClosure: (caseId: string) => req<ClosureResult>(`/api/cases/${caseId}/closure`),
  closeCase: (caseId: string) => req<{ status: string }>(`/api/cases/${caseId}/close`, { method: "POST", body: JSON.stringify({}) }),
};
