import type { IndustryProfile, CompanyRules } from "@complaintops/shared";

/**
 * 業種プロファイルの正本テーブル（single source of truth）。
 * 呼称・業種特性・事実確認・確認アクション・客の反応・禁忌の種を1か所に集約し、
 * 各エージェント（判定/助言/客演技/初期設定）がここを参照する。
 */
export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  ec: {
    id: "ec",
    label: "通販・EC",
    customer_term: "お客様",
    setting: "ECサイト・通販で商品を購入した顧客からのクレーム。注文番号・配送・返品・不良品などの文脈。",
    fact_finding: "状況を正確に確認するため、注文番号と商品の状態（写真など）をご共有いただけますでしょうか。",
    next_confirm: ["注文番号を確認", "商品の状態（写真）を確認", "配送状況を確認"],
    customer_reactions: {
      acknowledge: "まず謝罪の一つもないんですか。誠意が感じられません。",
      factfind: "注文番号なら届いたメールにあります。それで、どうしてくれるんですか？",
      propose: "確認はわかりましたが、結局返品か交換かどっちなんですか？",
      close: "本当にちゃんと処理されるんですよね？記録しておいてください。",
      resolved: "わかりました。ご対応ありがとうございます。よろしくお願いします。",
    },
    forbidden_seeds: [
      { phrase: "必ず返金します", category: "refund_commitment", severity: "high", reason: "返金は責任者の承認が必要なため" },
      { phrase: "当社の責任です", category: "legal_responsibility", severity: "high", reason: "原因確認前に責任を断定する表現のため" },
      { phrase: "SNSに書かないでください", category: "customer_action_restriction", severity: "medium", reason: "顧客の行動を制限すると逆効果のため" },
      { phrase: "こちらでは対応できません", category: "dismissive", severity: "medium", reason: "突き放す表現は炎上・信頼低下につながるため" },
    ],
    approval_seeds: ["返金", "高額補償", "顧客への正式送信"],
    samples: ["届いた商品が破損していました。", "注文した色と違うものが届きました。", "一週間待っても発送されません。"],
  },
  care: {
    id: "care",
    label: "介護・福祉",
    customer_term: "ご利用者様（本人）／ご家族様（ご家族）",
    setting:
      "介護・福祉サービスのクレーム。クレーム主はご家族であることが多い。利用者本人は『ご利用者様』、その家族は『ご家族様』と呼ぶ。『お客様』『購入』『商品』とは絶対に言わない。送迎・入浴・食事・排泄介助・服薬・職員の対応などの文脈で話すこと。",
    fact_finding: "状況を正確に確認するため、発生した日時と、ご利用者様のお名前・担当職員を教えていただけますでしょうか。",
    next_confirm: ["発生日時を確認", "ご利用者様・担当職員を確認", "支援記録を確認"],
    customer_reactions: {
      acknowledge: "親の世話を任せているのに、謝罪もないんですか。",
      factfind: "日時はこの前の送迎の時です。それより、母にどう対応したのか説明してください。",
      propose: "確認はいいですが、今後どうしてくれるんですか。再発しないんですか？",
      close: "ちゃんと記録して、職員にも共有してくださいね。母が心配なんです。",
      resolved: "わかりました。丁寧にご対応いただきありがとうございます。母をよろしくお願いします。",
    },
    forbidden_seeds: [
      { phrase: "ご家族には黙っていてください", category: "customer_action_restriction", severity: "high", reason: "家族への情報隠蔽は重大な信頼失墜・通報リスクのため" },
      { phrase: "うちの職員に落ち度はありません", category: "legal_responsibility", severity: "high", reason: "事実確認前に責任を否定するため" },
      { phrase: "決まりですので無理です", category: "dismissive", severity: "medium", reason: "杓子定規な拒絶は不信を招くため" },
      { phrase: "必ず返金・補償します", category: "refund_commitment", severity: "high", reason: "補償は事業所の承認・規定が必要なため" },
    ],
    approval_seeds: ["利用料の減免・返金", "補償", "ご家族への正式説明・文書", "行政・ケアマネへの報告"],
    samples: [
      "送迎の時間に職員さんが来てくれませんでした。",
      "母への対応が冷たかったと家族から聞いています。説明してください。",
      "支援の内容が最初の説明と違います。",
    ],
  },
  food: {
    id: "food",
    label: "飲食・レストラン",
    customer_term: "お客様",
    setting: "飲食店・レストランに来店した客からのクレーム。料理・接客・衛生・会計などの文脈。",
    fact_finding: "状況を正確に確認するため、ご来店の日時とお席・状況を教えていただけますでしょうか。",
    next_confirm: ["来店日時・席を確認", "担当者・状況を確認", "レシートを確認"],
    customer_reactions: {
      acknowledge: "謝罪もなしですか。気分が悪いです。",
      factfind: "昨日の夜、窓際の席です。で、どうしてくれるんですか？",
      propose: "確認はいいので、作り直すのか返金なのかはっきりしてください。",
      close: "衛生管理、ちゃんとしてくださいよ。記録しておいて。",
      resolved: "わかりました。丁寧なご対応ありがとうございます。",
    },
    forbidden_seeds: [
      { phrase: "必ず返金・無料にします", category: "refund_commitment", severity: "high", reason: "返金は店長承認が必要なため" },
      { phrase: "当店に責任はありません", category: "legal_responsibility", severity: "high", reason: "原因確認前の責任否定のため" },
      { phrase: "クレーマーですね", category: "dismissive", severity: "high", reason: "顧客を侮辱する表現のため" },
      { phrase: "SNSには書かないでください", category: "customer_action_restriction", severity: "medium", reason: "行動制限は逆効果のため" },
    ],
    approval_seeds: ["返金・無料提供", "高額補償", "顧客への正式対応"],
    samples: ["料理に髪の毛が入っていました。", "注文と違う料理が出てきました。", "店員の態度が悪かったです。"],
  },
  saas: {
    id: "saas",
    label: "SaaS・IT",
    customer_term: "お客様／ご担当者様",
    setting: "BtoB SaaSのクレーム。法人契約のご担当者からの問い合わせ。アカウント・契約・障害・請求などの文脈。",
    fact_finding: "状況を正確に確認するため、アカウントIDと発生時刻・エラー内容を教えていただけますでしょうか。",
    next_confirm: ["アカウントID・契約を確認", "発生時刻・操作ログを確認", "エラー内容を確認"],
    customer_reactions: {
      acknowledge: "業務が止まっているんですが、謝罪はないんですか。",
      factfind: "アカウントIDは追って送ります。それより復旧の見込みは？",
      propose: "確認はわかりましたが、いつ直るのか、補償はどうなるんですか。",
      close: "再発防止策とログ、後で共有してください。",
      resolved: "承知しました。迅速なご対応ありがとうございます。",
    },
    forbidden_seeds: [
      { phrase: "必ず返金・補償します", category: "refund_commitment", severity: "high", reason: "返金・SLA補償は契約と承認が必要なため" },
      { phrase: "弊社に責任はありません", category: "legal_responsibility", severity: "high", reason: "原因調査前の責任否定のため" },
      { phrase: "仕様ですのでご了承ください", category: "dismissive", severity: "medium", reason: "一方的な仕様説明は不信を招くため" },
      { phrase: "公開しないでください", category: "customer_action_restriction", severity: "medium", reason: "行動制限は逆効果のため" },
    ],
    approval_seeds: ["返金・SLA補償", "契約変更", "顧客への正式回答", "法務確認"],
    samples: ["サービスにログインできず業務が止まっています。", "請求金額が契約と違います。", "データが消えました。どうなっているんですか。"],
  },
  mfg: {
    id: "mfg",
    label: "製造・メーカー",
    customer_term: "お客様／御社",
    setting: "製造業のBtoB取引のクレーム。納品物・部品の不具合、ロット・納期などの文脈。",
    fact_finding: "状況を正確に確認するため、注文番号やロット番号と、不具合の状況（写真など）をご共有いただけますでしょうか。",
    next_confirm: ["注文番号/ロットを確認", "不具合の状況（写真）を確認", "発生工程を確認"],
    customer_reactions: {
      acknowledge: "不良品で生産が止まっているんですが、謝罪は？",
      factfind: "ロット番号は納品書にあります。で、代替品はいつ入るんですか。",
      propose: "確認はいいので、交換と原因対策をどうするのか示してください。",
      close: "是正報告書、後で提出してください。再発は困ります。",
      resolved: "承知しました。ご対応ありがとうございます。",
    },
    forbidden_seeds: [
      { phrase: "必ず全数交換・補償します", category: "refund_commitment", severity: "high", reason: "補償範囲は品証・承認が必要なため" },
      { phrase: "弊社の不良ではありません", category: "legal_responsibility", severity: "high", reason: "原因調査前の責任否定のため" },
      { phrase: "仕様の範囲内です", category: "dismissive", severity: "medium", reason: "一方的な仕様主張は不信を招くため" },
      { phrase: "内密にお願いします", category: "customer_action_restriction", severity: "medium", reason: "情報隠蔽は信頼失墜のため" },
    ],
    approval_seeds: ["交換・返品", "高額補償", "是正報告書の正式提出", "法務確認"],
    samples: ["納品された部品に不具合があります。", "ロット全体で寸法がずれています。", "納期に間に合っていません。"],
  },
};

export const GENERIC_PROFILE: IndustryProfile = {
  id: "generic",
  label: "一般",
  customer_term: "お客様",
  setting: "一般的な顧客対応のクレーム。",
  fact_finding: "状況を正確に確認するため、発生日時と具体的な状況を教えていただけますでしょうか。",
  next_confirm: ["発生日時を確認", "具体的な状況を確認", "関連記録を確認"],
  customer_reactions: {
    acknowledge: "まず謝罪の一つもないんですか。誠意が感じられません。",
    factfind: "状況はさっき話した通りです。それで、どうしてくれるんですか？",
    propose: "確認はわかりましたが、結局どう対応してくれるのか教えてください。",
    close: "それで本当に大丈夫なんですか？ちゃんと記録して、再発防止してくださいね。",
    resolved: "わかりました。丁寧にご対応いただき、ありがとうございます。引き続きよろしくお願いします。",
  },
  forbidden_seeds: [
    { phrase: "必ず返金します", category: "refund_commitment", severity: "high", reason: "返金は責任者の承認が必要なため" },
    { phrase: "当社の責任です", category: "legal_responsibility", severity: "high", reason: "原因確認前に責任を断定する表現のため" },
    { phrase: "SNSに書かないでください", category: "customer_action_restriction", severity: "medium", reason: "顧客の行動を制限すると逆効果のため" },
    { phrase: "こちらでは対応できません", category: "dismissive", severity: "medium", reason: "突き放す表現は炎上・信頼低下につながるため" },
  ],
  approval_seeds: ["返金", "高額補償", "顧客への正式送信"],
  samples: [],
};

/** 業種ID/会社ルールからプロファイルを解決。保存済み(Gemini生成)を優先し、無ければテーブル、無ければ汎用。 */
export function resolveProfile(industryId?: string, policy?: CompanyRules): IndustryProfile {
  if (policy?.industry_profile) {
    const p = policy.industry_profile;
    if (!industryId || p.id === industryId || policy.industry_id === industryId) return p;
  }
  if (industryId && INDUSTRY_PROFILES[industryId]) return INDUSTRY_PROFILES[industryId];
  return GENERIC_PROFILE;
}

export function isKnownIndustry(industryId?: string): boolean {
  return !!(industryId && INDUSTRY_PROFILES[industryId]);
}
