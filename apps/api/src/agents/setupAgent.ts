import type { CompanyRules, ForbiddenPhrase, ForbiddenCategory, IndustryProfile } from "@complaintops/shared";
import { INDUSTRY_PROFILES, GENERIC_PROFILE, isKnownIndustry } from "../domain/industryProfiles";
import { geminiSetupRules, geminiIndustryProfile, type GeminiProfileResult } from "./geminiClient";

interface SetupInput {
  business_type?: string;
  text?: string;
  company_name?: string;
  industry_id?: string;
  operator_name?: string;
}

const CATS: ForbiddenCategory[] = ["refund_commitment", "legal_responsibility", "customer_action_restriction", "dismissive", "other"];
function coerceCategory(c: string): ForbiddenCategory {
  return (CATS as string[]).includes(c) ? (c as ForbiddenCategory) : "other";
}
function coerceSeverity(s: string): ForbiddenPhrase["severity"] {
  return s === "high" || s === "medium" || s === "low" ? s : "medium";
}
function mapForbidden(arr?: { phrase: string; category: string; severity: string; reason: string }[]): ForbiddenPhrase[] {
  return (arr ?? [])
    .filter((f) => f && f.phrase && f.phrase.trim())
    .map((f) => ({ phrase: f.phrase.trim(), category: coerceCategory(f.category), severity: coerceSeverity(f.severity), reason: (f.reason || "").trim() }));
}

/** 決定論版（フォールバック）。業種が既知ならそのプロファイルの禁忌・呼称を採用。 */
export function setupAgent(input: SetupInput): CompanyRules {
  const known = isKnownIndustry(input.industry_id);
  const profile = known ? INDUSTRY_PROFILES[input.industry_id as string] : GENERIC_PROFILE;
  const text = input.text ?? "";
  const approval = new Set<string>(profile.approval_seeds);
  if (text.includes("返金") || text.includes("返品")) approval.add("返金");
  if (text.includes("SNS") || text.includes("拡散") || text.includes("ネット")) approval.add("SNS拡散リスク");
  if (text.includes("法") || text.includes("弁護士") || text.includes("訴")) approval.add("法的責任を認める表現");
  if (text.includes("高額") || text.includes("補償") || text.includes("賠償")) approval.add("高額補償");
  if (text.includes("個人情報") || text.includes("プライバシー")) approval.add("個人情報を含む外部送信");
  approval.add("顧客への正式送信");
  const tone = text.includes("毅然") || text.includes("厳") ? "丁寧で毅然" : "丁寧で柔らかい";
  return {
    business_type: input.business_type || "EC",
    tone,
    forbidden_phrases: profile.forbidden_seeds,
    approval_required: Array.from(approval),
    company_name: input.company_name?.trim() || undefined,
    industry_id: input.industry_id || undefined,
    operator_name: input.operator_name?.trim() || undefined,
    industry_profile: known ? profile : undefined,
  };
}

function profileFromGemini(input: SetupInput, g: GeminiProfileResult): IndustryProfile {
  const r = g.customer_reactions ?? {};
  const gr = GENERIC_PROFILE.customer_reactions;
  return {
    id: input.industry_id || "custom",
    label: input.business_type || "一般",
    customer_term: g.customer_term?.trim() || GENERIC_PROFILE.customer_term,
    setting: g.setting?.trim() || `${input.business_type || "一般"}のクレーム対応。`,
    fact_finding: g.fact_finding?.trim() || GENERIC_PROFILE.fact_finding,
    next_confirm: g.next_confirm && g.next_confirm.length ? g.next_confirm.map(String) : GENERIC_PROFILE.next_confirm,
    customer_reactions: {
      acknowledge: r.acknowledge?.trim() || gr.acknowledge,
      factfind: r.factfind?.trim() || gr.factfind,
      propose: r.propose?.trim() || gr.propose,
      close: r.close?.trim() || gr.close,
      resolved: r.resolved?.trim() || gr.resolved,
    },
    forbidden_seeds: mapForbidden(g.forbidden_phrases),
    approval_seeds: (g.approval_required ?? []).map(String),
    samples: [],
  };
}

/**
 * Gemini有効時：既知業種は会社ルールを精緻化、未知業種は業種プロファイル一式を生成して保存。
 * 失敗・無効時は決定論版を返す（verify-before-trust）。
 */
export async function buildCompanyRules(input: SetupInput): Promise<CompanyRules> {
  const base = setupAgent(input);
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) return base;
  try {
    if (isKnownIndustry(input.industry_id)) {
      const g = await geminiSetupRules({ industry_label: input.business_type, company_name: input.company_name, text: input.text });
      const forbidden = mapForbidden(g.forbidden_phrases);
      const approval = g.approval_required && g.approval_required.length > 0
        ? Array.from(new Set([...g.approval_required.map(String), "顧客への正式送信"]))
        : base.approval_required;
      return {
        ...base,
        tone: g.tone?.trim() || base.tone,
        approval_required: approval,
        forbidden_phrases: forbidden.length >= 2 ? forbidden : base.forbidden_phrases,
      };
    }
    // 未知業種：プロファイル一式を生成して保存
    const g = await geminiIndustryProfile(input.business_type || "一般", input.text);
    const profile = profileFromGemini(input, g);
    const forbidden = profile.forbidden_seeds;
    const approval = profile.approval_seeds.length > 0
      ? Array.from(new Set([...profile.approval_seeds, "顧客への正式送信"]))
      : base.approval_required;
    return {
      ...base,
      tone: g.tone?.trim() || base.tone,
      approval_required: approval,
      forbidden_phrases: forbidden.length >= 2 ? forbidden : base.forbidden_phrases,
      industry_profile: profile,
    };
  } catch {
    return base;
  }
}
