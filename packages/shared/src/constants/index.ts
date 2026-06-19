import type { ForbiddenPhrase, CompanyRules } from "../types";

// 02 MVP仕様 8.6 / 15プロンプト.txt 期待出力に準拠した禁忌表現
export const CORE_FORBIDDEN_PHRASES: ForbiddenPhrase[] = [
  {
    phrase: "必ず返金します",
    category: "refund_commitment",
    severity: "high",
    reason: "返金は店長承認が必要なため",
  },
  {
    phrase: "当社の責任です",
    category: "legal_responsibility",
    severity: "high",
    reason: "原因確認前に責任を断定する表現のため",
  },
  {
    phrase: "SNSに書かないでください",
    category: "customer_action_restriction",
    severity: "high",
    reason: "顧客の行動を直接制止すると感情を逆なでする可能性があるため",
  },
  {
    phrase: "こちらでは対応できません",
    category: "dismissive",
    severity: "medium",
    reason: "突き放す表現は炎上・信頼低下につながるため",
  },
];

// 02 MVP仕様 7.1 のAI生成ルール例（ECデフォルト）
export const DEFAULT_COMPANY_RULES: CompanyRules = {
  business_type: "EC",
  tone: "丁寧で柔らかい",
  forbidden_phrases: CORE_FORBIDDEN_PHRASES,
  approval_required: [
    "返金",
    "法的責任を認める表現",
    "SNS拡散リスク",
    "怒りレベル高",
    "顧客への正式送信",
  ],
};

// 15プロンプト.txt「モック判定ルール」のキーワード辞書
export const RISK_KEYWORDS = {
  sns: ["SNS", "ＳＮＳ", "拡散", "ツイート", "投稿", "晒", "ネットに"],
  refund: ["返金", "金を返", "返してください", "弁償"],
  damage: ["壊れ", "破損", "割れ", "不良", "故障"],
  legal: ["弁護士", "訴え", "訴訟", "法的", "裁判"],
  threat: ["殺す", "脅", "ぶっ", "許さない"],
} as const;

// 04 DB設計 4章 主要コレクション（Firestore差し替え時の名前を先に固定）
export const COLLECTIONS = {
  organizations: "organizations",
  locations: "locations",
  users: "users",
  customers: "customers",
  job_types: "job_types",
  work_items: "work_items",
  policy_versions: "policy_versions",
  complaint_cases: "complaint_cases",
  sessions: "sessions",
  conversation_events: "conversation_events",
  ai_advice_events: "ai_advice_events",
  approval_requests: "approval_requests",
  tickets: "tickets",
  reports: "reports",
  closure_checks: "closure_checks",
  improvement_suggestions: "improvement_suggestions",
  communication_drafts: "communication_drafts",
  audit_events: "audit_events",
} as const;
