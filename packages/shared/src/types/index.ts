// ComplaintOps Copilot 共有型定義
// 設計資料 04(DB) / 05(API) / 02(MVP仕様 8章) に準拠

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

// 02 MVP仕様 9章 案件ステータス
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

// 15プロンプト.txt の期待出力（RiskResult + Advice の統合）
export interface AnalyzeResult extends RiskResult, Advice {}

export interface Report {
  generated_at: string;
  markdown: string;
}

export interface Evaluation {
  status: "ok" | "caution";
  issues: string[];
  comment: string;
}

// クレーム対応の型（4ステップ）の進捗
export interface FlowStage {
  key: string;
  label: string;
  done: boolean;
}
export interface FlowState {
  stages: FlowStage[];
  next_stage: string;
  all_done: boolean;
  resolved: boolean;
}

export interface Resolutions {
  supervisor_reported?: boolean;
  approved?: boolean;
  evidence_checked?: boolean;
  customer_replied?: boolean;
}

export interface ClosureResult {
  closure_status: "blocked" | "closeable";
  blocking_reasons: string[];
  required_actions: string[];
}

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

// 01 設計思想書 7.9 / 04 DB設計 3.8 軽量監査チェーン
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

export interface CompanyRules {
  business_type: string;
  tone: string;
  forbidden_phrases: ForbiddenPhrase[];
  approval_required: string[];
  company_name?: string;
  industry_id?: string;
  operator_name?: string;
}

// 業種テンプレート（02 MVP仕様 10章 / 01 設計思想 12章）
export interface JobTemplate {
  id: string;
  label: string;
  work_items: string[];
  common_complaints: string[];
  required_checks: string[];
}

// クレーム会話シミュレーション（練習モード）のシナリオ
export interface Scenario {
  id: string;
  label: string;
  industry: string;
  lines: string[];
}

// 共通APIレスポンス（05 API仕様 3.4）
export interface ApiOk<T> {
  ok: true;
  data: T;
  meta: { request_id: string; timestamp: string };
}

export interface ApiError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
  meta: { request_id: string; timestamp: string };
}
