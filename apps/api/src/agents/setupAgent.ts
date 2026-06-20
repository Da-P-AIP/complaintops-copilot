import type { CompanyRules, ForbiddenPhrase, ForbiddenCategory } from "@complaintops/shared";
import { CORE_FORBIDDEN_PHRASES } from "@complaintops/shared";
import { geminiSetupRules } from "./geminiClient";

interface SetupInput {
  business_type?: string;
  text?: string;
  company_name?: string;
  industry_id?: string;
  operator_name?: string;
}

/** 決定論版（フォールバック）。自然文から会社ルールを生成。 */
export function setupAgent(input: SetupInput): CompanyRules {
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

const CATS: ForbiddenCategory[] = ["refund_commitment", "legal_responsibility", "customer_action_restriction", "dismissive", "other"];
function coerceCategory(c: string): ForbiddenCategory {
  return (CATS as string[]).includes(c) ? (c as ForbiddenCategory) : "other";
}
function coerceSeverity(s: string): ForbiddenPhrase["severity"] {
  return s === "high" || s === "medium" || s === "low" ? s : "medium";
}

/**
 * Gemini が有効なら業種・会社に即した禁忌表現・承認条件・トーンを生成し、決定論版にマージ。
 * 失敗・無効時は決定論版を返す（verify-before-trust）。
 */
export async function buildCompanyRules(input: SetupInput): Promise<CompanyRules> {
  const base = setupAgent(input);
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) return base;
  try {
    const g = await geminiSetupRules({
      industry_label: input.business_type,
      company_name: input.company_name,
      text: input.text,
    });
    const forbidden: ForbiddenPhrase[] = (g.forbidden_phrases ?? [])
      .filter((f) => f && f.phrase && f.phrase.trim())
      .map((f) => ({
        phrase: f.phrase.trim(),
        category: coerceCategory(f.category),
        severity: coerceSeverity(f.severity),
        reason: (f.reason || "").trim(),
      }));
    const approval =
      g.approval_required && g.approval_required.length > 0
        ? Array.from(new Set([...g.approval_required.map((x) => String(x)), "顧客への正式送信"]))
        : base.approval_required;
    return {
      ...base,
      tone: g.tone?.trim() || base.tone,
      approval_required: approval,
      forbidden_phrases: forbidden.length >= 2 ? forbidden : base.forbidden_phrases,
    };
  } catch {
    return base;
  }
}
