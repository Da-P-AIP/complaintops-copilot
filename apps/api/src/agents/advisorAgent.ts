import type { RiskResult, Advice, ForbiddenPhrase } from "@complaintops/shared";

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

// クレーム対応の型(4ステップ)に応じた「今言うべきこと」
const STAGE_SAY: Record<string, (fact: string) => string[]> = {
  acknowledge: () => ["ご不快な思いをさせてしまい、申し訳ございません。", "まずは状況をしっかり伺わせてください。"],
  factfind: (fact) => ["お話しいただきありがとうございます。", fact],
  propose: () => [
    "確認のうえ、交換・代替・再対応などで進めさせていただきます。",
    "返金・補償が必要な場合は、上席の承認を得てから改めてご連絡いたします。",
  ],
  close: () => [
    "ご不便をおかけし、申し訳ありませんでした。本件は記録し、再発防止に努めます。",
    "他にご不明な点があれば、いつでもお申し付けください。",
  ],
};

const STAGE_HINT: Record<string, string> = {
  acknowledge: "まず謝罪・共感を示す",
  factfind: "事実を具体的に確認する",
  propose: "対応方針・代替案を提示する（確約はしない）",
  close: "記録・再発防止を伝えて合意する",
};

export function advisorAgent(
  _text: string,
  risk: RiskResult,
  forbidden: ForbiddenPhrase[],
  industryId = "ec",
  nextStage = "acknowledge",
): Advice {
  const ind = NEXT_CONFIRM[industryId] ? industryId : "ec";
  const stageFn = STAGE_SAY[nextStage] ?? STAGE_SAY.acknowledge;
  const say = stageFn(FACT_FINDING[ind]);

  const next: string[] = [];
  if (STAGE_HINT[nextStage]) next.push(`次のステップ: ${STAGE_HINT[nextStage]}`);
  if (
    nextStage === "factfind" &&
    (risk.detected_risks.includes("evidence_missing") || risk.detected_risks.includes("product_damage") || risk.risk_level !== "low")
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
