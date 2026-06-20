import type { RiskResult, Advice, ForbiddenPhrase } from "@complaintops/shared";

// 業種ごとの「事実確認の言い回し」と「次に確認すべき項目」
const FACT_FINDING: Record<string, string> = {
  ec: "状況を正確に確認するため、注文番号と商品の状態（写真など）をご共有いただけますでしょうか。",
  care: "状況を正確に確認するため、発生した日時と、ご利用者様のお名前・担当職員を教えていただけますでしょうか。",
  food: "状況を正確に確認するため、ご来店の日時とお席・状況を教えていただけますでしょうか。",
  saas: "状況を正確に確認するため、アカウントIDと発生時刻・エラー内容を教えていただけますでしょうか。",
  mfg: "状況を正確に確認するため、注文番号やロット番号と、不具合の状況（写真など）をご共有いただけますでしょうか。",
};

const NEXT_CONFIRM: Record<string, string[]> = {
  ec: ["注文番号を確認", "商品の状態（写真）を確認", "配送状況を確認"],
  care: ["発生日時を確認", "ご利用者様・担当職員を確認", "支援記録を確認"],
  food: ["来店日時・席を確認", "担当者・状況を確認", "レシートを確認"],
  saas: ["アカウントID・契約を確認", "発生時刻・操作ログを確認", "エラー内容を確認"],
  mfg: ["注文番号/ロットを確認", "不具合の状況（写真）を確認", "発生工程を確認"],
};

/**
 * Advisor Agent（モック版・業種対応）。
 * 業種(industryId)に応じた事実確認・次アクションを出す。
 */
export function advisorAgent(
  _text: string,
  risk: RiskResult,
  forbidden: ForbiddenPhrase[],
  industryId = "ec",
): Advice {
  const ind = NEXT_CONFIRM[industryId] ? industryId : "ec";

  const say: string[] = [
    "ご不快な思いをさせてしまい申し訳ございません。",
    FACT_FINDING[ind],
    "確認後、担当者より対応方針をご案内いたします。",
  ];

  const next: string[] = [];
  if (
    risk.detected_risks.includes("evidence_missing") ||
    risk.detected_risks.includes("product_damage") ||
    risk.risk_level !== "low"
  ) {
    next.push(...NEXT_CONFIRM[ind]);
  }
  if (risk.supervisor_report_required) next.push("上司報告を作成");
  if (risk.approval_required) next.push("返金・補償の判断は保留");
  if (risk.detected_risks.includes("legal_risk")) next.push("法務確認へエスカレーション");
  if (risk.detected_risks.includes("violence_or_threat_risk")) next.push("安全確保・管理者へ即時連絡");
  if (next.length === 0) next.push("内容を記録し、対応方針を確認");

  return { say_this: say, dont_say_this: forbidden, next_actions: next };
}
