import type { RiskResult, ForbiddenPhrase, CompanyRules, DetectedRisk } from "@complaintops/shared";
import { DEFAULT_COMPANY_RULES } from "@complaintops/shared";

/**
 * Rule Agent（モック版）
 * 会社ルールの禁忌表現から、検出リスクに関連するものを抽出して提示する。
 * 「言ってはいけないこと」を文脈に合わせて出すのが狙い（02 MVP仕様 8.6）。
 */
export function ruleAgent(
  risk: RiskResult,
  rules: CompanyRules = DEFAULT_COMPANY_RULES,
): ForbiddenPhrase[] {
  const has = (r: DetectedRisk) => risk.detected_risks.includes(r);
  const out: ForbiddenPhrase[] = [];

  for (const p of rules.forbidden_phrases) {
    switch (p.category) {
      case "refund_commitment":
        if (has("refund_possible") || risk.approval_required) out.push(p);
        break;
      case "legal_responsibility":
        if (has("legal_risk") || has("product_damage")) out.push(p);
        break;
      case "customer_action_restriction":
        if (has("sns_risk")) out.push(p);
        break;
      case "dismissive":
        if (risk.risk_level === "high" || risk.risk_level === "critical") out.push(p);
        break;
      default:
        break;
    }
  }
  return out;
}
