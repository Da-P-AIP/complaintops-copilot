import type { AnalyzeResult, DetectedRisk, ForbiddenPhrase, RiskLevel } from "@complaintops/shared";
import { riskJudgeAgent } from "../agents/riskJudgeAgent";
import { ruleAgent } from "../agents/ruleAgent";
import { advisorAgent } from "../agents/advisorAgent";
import { geminiAnalyze } from "../agents/geminiClient";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVELS[Math.max(LEVELS.indexOf(a), LEVELS.indexOf(b))] ?? a;
}

/** 決定論的なモック判定（= 安全フロア。Geminiが見落としても過小判定しないための土台） */
function mockAnalyze(text: string): AnalyzeResult {
  const risk = riskJudgeAgent(text);
  const forbidden = ruleAgent(risk);
  const advice = advisorAgent(text, risk, forbidden);
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
 * ComplaintOps Orchestrator（MVP / ハイブリッド）
 * Observe → Interpret → Constrain → Advise。
 * AI_MODE=gemini かつ APIキーがあれば Gemini を使い、モックの安全フロアと安全側マージする。
 * フラグはOR、リスクはunion、禁忌はフロアを必ず含む。失敗時はフロアへフォールバック（verify-before-trust）。
 */
export async function analyzeUtterance(text: string): Promise<AnalyzeResult> {
  const floor = mockAnalyze(text);

  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) {
    return floor;
  }

  try {
    const g = await geminiAnalyze(text);
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
    // Geminiが落ちても対応は止めない。決定論的な安全フロアを返す。
    return floor;
  }
}
