import type { RiskResult, Advice, ForbiddenPhrase } from "@complaintops/shared";

/**
 * Advisor Agent（モック版）
 * 「今言うべきこと」「言ってはいけないこと」「次アクション」を生成する。
 * 安全ルール（07 Safety Policy）：謝罪は限定的・事実確認優先・返金/責任を断定しない。
 */
export function advisorAgent(
  _text: string,
  risk: RiskResult,
  forbidden: ForbiddenPhrase[],
): Advice {
  const say: string[] = ["ご不快な思いをさせてしまい申し訳ございません。"];

  if (risk.detected_risks.includes("product_damage")) {
    say.push("状況を正確に確認するため、注文番号と破損箇所の写真をご共有いただけますでしょうか。");
  } else {
    say.push("状況を正確に確認するため、いくつか詳細を教えていただけますでしょうか。");
  }
  say.push("確認後、担当者より対応方針をご案内いたします。");

  const next: string[] = [];
  if (risk.detected_risks.includes("evidence_missing") || risk.detected_risks.includes("product_damage")) {
    next.push("注文番号を確認");
    next.push("破損写真を確認");
    next.push("配送状況を確認");
  }
  if (risk.supervisor_report_required) next.push("上司報告を作成");
  if (risk.approval_required) next.push("返金判断は保留");
  if (risk.detected_risks.includes("legal_risk")) next.push("法務確認へエスカレーション");
  if (risk.detected_risks.includes("violence_or_threat_risk")) next.push("安全確保・管理者へ即時連絡");
  if (next.length === 0) next.push("内容を記録し、対応方針を確認");

  return { say_this: say, dont_say_this: forbidden, next_actions: next };
}
