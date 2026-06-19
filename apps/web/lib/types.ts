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
