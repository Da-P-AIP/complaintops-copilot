import type { AnalyzeResult, DetectedRisk, ForbiddenPhrase, RiskLevel, CompanyRules } from "@complaintops/shared";
import { DEFAULT_COMPANY_RULES } from "@complaintops/shared";
import { riskJudgeAgent } from "../agents/riskJudgeAgent";
import { ruleAgent } from "../agents/ruleAgent";
import { advisorAgent } from "../agents/advisorAgent";
import { geminiAnalyze } from "../agents/geminiClient";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVELS[Math.max(LEVELS.indexOf(a), LEVELS.indexOf(b))] ?? a;
}

function mockAnalyze(text: string, policy: CompanyRules): AnalyzeResult {
  const risk = riskJudgeAgent(text);
  const forbidden = ruleAgent(risk, policy);
  const advice = advisorAgent(text, risk, forbidden, policy.industry_id);
  return { ...risk, ...advice };
}

function mergeForbidden(floor: ForbiddenPhrase[], extra: ForbiddenPhrase[]): ForbiddenPhrase[] {
  const seen = new Set(floor.map((f) => f.phrase));
  const out = [...floor];
  for (const f of extra) {
    if (f && f.phrase && !seen.has(f.phrase)) {
      seen.add(f.phrase);
      out.push(f);
    }
  }
  return out;
}

/**
 * ComplaintOps Orchestrator（ハイブリッド）。
 * 組織ごとの会社ルール(policy)を安全フロアとして使い、Gemini有効時は安全側マージ。
 */
export async function analyzeUtterance(text: string, policy: CompanyRules = DEFAULT_COMPANY_RULES, history?: string): Promise<AnalyzeResult> {
  const floor = mockAnalyze(text, policy);
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) return floor;
  try {
    const g = await geminiAnalyze(text, history);
    const detected = new Set<DetectedRisk>([
      ...floor.detected_risks,
      ...((g.detected_risks as DetectedRisk[] | undefined) ?? []),
    ]);
    return {
      risk_level: maxLevel(floor.risk_level, (g.risk_level as RiskLevel | undefined) ?? "low"),
      anger_level: g.anger_level ?? floor.anger_level,
      complaint_type: g.complaint_type ?? floor.complaint_type,
      detected_risks: Array.from(detected),
      supervisor_report_required: floor.supervisor_report_required || g.supervisor_report_required === true,
      approval_required: floor.approval_required || g.approval_required === true,
      say_this: g.say_this && g.say_this.length > 0 ? g.say_this : floor.say_this,
      dont_say_this: mergeForbidden(floor.dont_say_this, g.dont_say_this ?? []),
      next_actions: g.next_actions && g.next_actions.length > 0 ? g.next_actions : floor.next_actions,
    };
  } catch {
    return floor;
  }
}
