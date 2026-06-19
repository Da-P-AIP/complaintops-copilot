import type { AnalyzeResult, ComplaintCase, Session, ConversationEvent } from "@/lib/types";

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
  createCase: () => req<ComplaintCase>("/api/cases", { method: "POST", body: JSON.stringify({ business_type: "EC" }) }),
  startSession: (caseId: string) =>
    req<Session>(`/api/cases/${caseId}/sessions`, { method: "POST", body: JSON.stringify({ channel: "text" }) }),
  addEvent: (sessionId: string, text: string) =>
    req<EventResult>(`/api/sessions/${sessionId}/events`, {
      method: "POST",
      body: JSON.stringify({ text, speaker: "customer" }),
    }),
};
