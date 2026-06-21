import type { RiskResult, Advice, ForbiddenPhrase, IndustryProfile } from "@complaintops/shared";
import { GENERIC_PROFILE } from "../domain/industryProfiles";

// クレーム対応の型(4ステップ)に応じた「今言うべきこと」。呼称・事実確認は業種プロファイルから。
const STAGE_SAY: Record<string, (p: IndustryProfile) => string[]> = {
  acknowledge: () => ["ご不快な思いをさせてしまい、申し訳ございません。", "まずは状況をしっかり伺わせてください。"],
  factfind: (p) => ["お話しいただきありがとうございます。", p.fact_finding],
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
  profile: IndustryProfile = GENERIC_PROFILE,
  nextStage = "acknowledge",
): Advice {
  const stageFn = STAGE_SAY[nextStage] ?? STAGE_SAY.acknowledge;
  const say = stageFn(profile);

  const next: string[] = [];
  if (STAGE_HINT[nextStage]) next.push(`次のステップ: ${STAGE_HINT[nextStage]}`);
  if (
    nextStage === "factfind" &&
    (risk.detected_risks.includes("evidence_missing") || risk.detected_risks.includes("product_damage") || risk.risk_level !== "low")
  ) {
    next.push(...profile.next_confirm);
  }
  if (risk.supervisor_report_required) next.push("上司報告を作成");
  if (risk.approval_required) next.push("返金・補償の判断は保留");
  if (risk.detected_risks.includes("legal_risk")) next.push("法務確認へエスカレーション");
  if (risk.detected_risks.includes("violence_or_threat_risk")) next.push("安全確保・管理者へ即時連絡");
  if (next.length === 0) next.push("内容を記録し、対応方針を確認");

  return { say_this: say, dont_say_this: forbidden, next_actions: next };
}
