import type { CompanyRules } from "@complaintops/shared";
import { CORE_FORBIDDEN_PHRASES } from "@complaintops/shared";

/**
 * Setup Agent（モック版 / 01 設計思想 7.4・9.2）
 * 自然文の会社説明から会社ルール(CompanyRules)を生成する。
 * 会社名・業種ID・担当者名も受け取り、現場画面のパーソナライズに使う。
 */
export function setupAgent(input: {
  business_type?: string;
  text?: string;
  company_name?: string;
  industry_id?: string;
  operator_name?: string;
}): CompanyRules {
  const text = input.text ?? "";
  const approval: string[] = [];

  if (text.includes("返金") || text.includes("返品")) approval.push("返金");
  if (text.includes("SNS") || text.includes("拡散") || text.includes("ネット")) approval.push("SNS拡散リスク");
  if (text.includes("法") || text.includes("弁護士") || text.includes("訴")) approval.push("法的責任を認める表現");
  if (text.includes("高額") || text.includes("補償") || text.includes("賠償")) approval.push("高額補償");
  if (text.includes("個人情報") || text.includes("プライバシー")) approval.push("個人情報を含む外部送信");
  approval.push("顧客への正式送信");

  const tone = text.includes("毅然") || text.includes("厳") ? "丁寧で毅然" : "丁寧で柔らかい";

  return {
    business_type: input.business_type || "EC",
    tone,
    forbidden_phrases: CORE_FORBIDDEN_PHRASES,
    approval_required: Array.from(new Set(approval)),
    company_name: input.company_name?.trim() || undefined,
    industry_id: input.industry_id || undefined,
    operator_name: input.operator_name?.trim() || undefined,
  };
}
