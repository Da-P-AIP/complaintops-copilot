import type { ForbiddenPhrase, CompanyRules, JobTemplate, Scenario } from "../types";

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

// 業種テンプレート（02 MVP仕様 10章）。初期設定で選択し、確認項目などに使う。
export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: "ec",
    label: "EC・通販",
    work_items: ["注文", "商品", "配送", "返品", "返金"],
    common_complaints: ["商品破損", "配送遅延", "誤配送", "返金要求", "説明不足"],
    required_checks: ["注文番号", "商品名", "購入日", "配送状況", "破損写真"],
  },
  {
    id: "care",
    label: "介護・福祉",
    work_items: ["利用者", "支援記録", "送迎", "職員対応", "作業内容"],
    common_complaints: ["職員対応", "送迎遅れ", "支援内容", "利用者間トラブル", "説明不足"],
    required_checks: ["利用者名", "発生日", "担当職員", "支援記録", "関係者"],
  },
  {
    id: "food",
    label: "飲食",
    work_items: ["予約", "来店", "注文", "商品", "接客", "衛生"],
    common_complaints: ["接客態度", "異物混入", "提供遅延", "料金", "予約ミス"],
    required_checks: ["来店日時", "席番号", "担当者", "注文内容", "レシート"],
  },
  {
    id: "saas",
    label: "SaaS",
    work_items: ["契約", "アカウント", "障害", "請求", "サポート履歴"],
    common_complaints: ["ログイン不可", "請求ミス", "障害", "データ消失", "サポート遅延"],
    required_checks: ["アカウントID", "契約プラン", "発生時刻", "エラーメッセージ", "操作ログ"],
  },
  {
    id: "mfg",
    label: "製造",
    work_items: ["受注", "製造", "品質", "出荷", "保守"],
    common_complaints: ["不良品", "納期遅延", "仕様相違", "数量不足", "対応遅れ"],
    required_checks: ["注文番号/ロット", "製品名", "発生工程", "数量", "不具合写真"],
  },
];

// 業種に応じた「形態」の選択肢（対話型ウィザードの動的分岐の決定木フォールバック）
export const BUSINESS_FORMS: Record<string, string[]> = {
  ec: ["アパレル", "食品", "家電・ガジェット", "雑貨・日用品", "その他"],
  care: ["特養・老健", "デイサービス", "訪問介護", "障害福祉", "その他"],
  food: ["レストラン", "カフェ", "居酒屋", "デリバリー", "その他"],
  saas: ["業務SaaS(BtoB)", "個人向けアプリ", "決済・金融", "インフラ/API", "その他"],
  mfg: ["BtoB部品メーカー", "消費財メーカー", "食品製造", "受託製造(OEM)", "その他"],
};

// 承認者・通知先の代表的な選択肢（決定木）
export const APPROVER_OPTIONS = ["店長", "施設長", "管理者", "本部", "自分で判断", "その他"];
export const NOTIFY_OPTIONS = ["本部に通知", "上長に通知", "通知しない", "その他"];

// クレーム会話シミュレーション（簡易シナリオ）
export const SCENARIOS: Scenario[] = [
  {
    id: "ec_damage",
    label: "EC：破損＋SNS＋返金要求",
    industry: "ec",
    lines: [
      "昨日届いた商品が壊れていました。",
      "ちゃんと対応してくれないならSNSに書きますよ。",
      "とにかく今すぐ全額返金してください。",
    ],
  },
  {
    id: "food_foreign",
    label: "飲食：異物混入",
    industry: "food",
    lines: [
      "料理に髪の毛が入っていたんですけど。",
      "お店の衛生管理どうなってるんですか。",
      "責任者を出してください。最悪なお店ですね。",
    ],
  },
  {
    id: "saas_outage",
    label: "SaaS：障害＋法的示唆",
    industry: "saas",
    lines: [
      "朝からログインできず、業務が止まっています。",
      "これは損害賠償ものですよ。",
      "場合によっては弁護士に相談します。",
    ],
  },
  {
    id: "care_transport",
    label: "介護：送迎遅れ＋家族の不満",
    industry: "care",
    lines: [
      "送迎の時間に職員さんが来てくれませんでした。",
      "母への対応が冷たかったと家族から聞いています。説明してください。",
      "このままだと施設長に直接話しますよ。",
    ],
  },
  {
    id: "mfg_defect",
    label: "製造：不良品＋納期＋賠償示唆",
    industry: "mfg",
    lines: [
      "納品された部品に不良がありました。すぐ交換してください。",
      "そのうえ納期にも間に合っていません。",
      "損害が出たら賠償してもらいますからね。",
    ],
  },
];

// 初期設定チュートリアルの自然文サンプル（業種別）
export const SETUP_EXAMPLES: Record<string, string> = {
  ec: "うちは通販ショップです。返金は店長承認が必要です。SNSに書くと言われたら本部に通知してください。責任を認める言い方は避けたいです。改善提案は文章で表示してください。",
  care: "介護施設です。送迎やケアの苦情が多いです。家族への連絡は施設長承認が必要です。利用者の個人情報の扱いは慎重にしてください。",
  food: "飲食店です。接客や異物混入の苦情があります。返金や食事券のお詫びは店長承認にしてください。SNS投稿リスクは本部へ。",
  saas: "SaaSのサポートです。障害や請求ミスの問い合わせが多いです。返金・契約解除は管理者承認が必要です。法的な言及があれば法務へ回してください。",
};

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
