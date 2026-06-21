import type { KnowledgeRule, IndustryProfile } from "@complaintops/shared";
import { geminiExtractRule } from "./geminiClient";
import { genId } from "../db/store";

const CATS = ["事実確認", "エスカレーション", "顧客対応", "補償判断", "再発防止", "その他"];
function coerceCat(c?: string): string {
  return c && CATS.includes(c) ? c : "その他";
}

function deterministicStatement(profile?: IndustryProfile): string {
  if (profile && profile.id !== "generic") {
    const first = profile.next_confirm[0] ?? "事実確認";
    return `${profile.label}のクレームは、まず謝罪→${first}→方針提示→記録・再発防止の型で対応する。`;
  }
  return "クレームは、謝罪→事実確認→方針提示→記録・再発防止の型で対応する。";
}

/** 対応の会話・報告書から社内ルール候補を1件生成する（Gemini優先・失敗時は決定論）。 */
export async function buildRuleCandidate(input: {
  orgId: string;
  history: string;
  report: string;
  profile?: IndustryProfile;
  caseNo?: number;
  industryId?: string;
}): Promise<KnowledgeRule> {
  const base: KnowledgeRule = {
    id: genId("rule"),
    org_id: input.orgId,
    category: "その他",
    industry_id: input.industryId,
    statement: deterministicStatement(input.profile),
    rationale: "今回の対応から抽出（フォールバック）",
    source_case_no: input.caseNo,
    status: "candidate",
    use_count: 0,
    created_at: new Date().toISOString(),
  };
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) return base;
  try {
    const g = await geminiExtractRule(input.history, input.report, input.profile);
    if (g.statement && g.statement.trim()) {
      return {
        ...base,
        statement: g.statement.trim(),
        category: coerceCat(g.category),
        rationale: (g.rationale || "").trim() || base.rationale,
      };
    }
    return base;
  } catch {
    return base;
  }
}
