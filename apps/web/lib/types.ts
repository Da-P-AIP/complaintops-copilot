// Web 用の型定義（API/shared と同形。Webを単体デプロイ可能にするためローカル保持）
// 元: packages/shared/src/types/index.ts

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AngerLevel = "low" | "medium" | "high";
export type Speaker = "customer" | "operator" | "system";

export type ComplaintType =
  | "product_damage"
  | "delivery"
  | "refund"
  | "service"
  | "billing"
  | "other";

export type DetectedRisk =
  | "sns_risk"
  | "refund_possible"
  | "evidence_missing"
  | "legal_risk"
  | "privacy_risk"
  | "violence_or_threat_risk"
  | "product_damage"
  | "high_anger";

export type CaseStatus =
  | "new"
  | "in_progress"
  | "waiting_customer"
  | "waiting_manager_approval"
  | "waiting_internal_check"
  | "waiting_legal_review"
  | "waiting_refund_review"
  | "resolved_pending_close"
  | "closed"
  | "reopened";

export interface RiskResult {
  risk_level: RiskLevel;
  anger_level: AngerLevel;
  complaint_type: ComplaintType;
  detected_risks: DetectedRisk[];
  supervisor_report_required: boolean;
  approval_required: boolean;
}

export type ForbiddenCategory =
  | "refund_commitment"
  | "legal_responsibility"
  | "customer_action_restriction"
  | "dismissive"
  | "other";

export interface ForbiddenPhrase {
  phrase: string;
  category: ForbiddenCategory;
  severity: "low" | "medium" | "high";
  reason: string;
}

export interface Advice {
  say_this: string[];
  dont_say_this: ForbiddenPhrase[];
  next_actions: string[];
}

export interface AnalyzeResult extends RiskResult, Advice {}

export interface ComplaintCase {
  id: string;
  org_id: string;
  location_id: string;
  operator_id: string;
  customer_ref: string;
  job_type_id: string | null;
  case_type: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  latest_risk?: RiskResult;
  report?: Report;
  resolutions?: Resolutions;
  case_no?: number;
}

export interface Session {
  id: string;
  case_id: string;
  channel: string;
  started_at: string;
}

export interface ConversationEvent {
  id: string;
  session_id: string;
  case_id: string;
  speaker: Speaker;
  text: string;
  created_at: string;
}

export interface IndustryProfile {
  id: string;
  label: string;
  customer_term: string;
  setting: string;
  fact_finding: string;
  next_confirm: string[];
  customer_reactions: { acknowledge: string; factfind: string; propose: string; close: string; resolved: string };
  forbidden_seeds: ForbiddenPhrase[];
  approval_seeds: string[];
  samples: string[];
}

export interface CompanyRules {
  business_type: string;
  tone: string;
  forbidden_phrases: ForbiddenPhrase[];
  approval_required: string[];
  company_name?: string;
  industry_id?: string;
  operator_name?: string;
  industry_profile?: IndustryProfile;
}

export interface JobTemplate {
  id: string;
  label: string;
  work_items: string[];
  common_complaints: string[];
  required_checks: string[];
}

export interface JobTypesResponse {
  templates: JobTemplate[];
  examples: Record<string, string>;
}

export interface Scenario {
  id: string;
  label: string;
  industry: string;
  lines: string[];
}

export interface InterviewOptions {
  choices: string[];
  source: "gemini" | "deterministic";
}

export interface Report {
  generated_at: string;
  markdown: string;
}

export interface Resolutions {
  supervisor_reported?: boolean;
  approved?: boolean;
  evidence_checked?: boolean;
  customer_replied?: boolean;
}

export interface Evaluation {
  status: "ok" | "caution";
  issues: string[];
  comment: string;
}

export interface FlowStage { key: string; label: string; done: boolean; }
export interface FlowState { stages: FlowStage[]; next_stage: string; all_done: boolean; resolved: boolean; }

export interface ClosureResult {
  closure_status: "blocked" | "closeable";
  blocking_reasons: string[];
  required_actions: string[];
}

export interface AuditEvent {
  id: string;
  org_id: string;
  case_id: string | null;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  prev_hash: string;
  event_hash: string;
  created_at: string;
}
