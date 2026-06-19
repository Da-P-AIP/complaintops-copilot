import type { AnalyzeResult } from "@complaintops/shared";
import { riskJudgeAgent } from "../agents/riskJudgeAgent";
import { ruleAgent } from "../agents/ruleAgent";
import { advisorAgent } from "../agents/advisorAgent";

/**
 * ComplaintOps Orchestrator（MVP）
 * Observe → Interpret(Risk) → Constrain(Rule) → Advise の順で各Agentを統制し、
 * 結果を統合して返す。フロントは個別Agentを直接呼ばない（05 API仕様 2.3）。
 */
export function analyzeUtterance(text: string): AnalyzeResult {
  const risk = riskJudgeAgent(text); // Interpret
  const forbidden = ruleAgent(risk); // Constrain
  const advice = advisorAgent(text, risk, forbidden); // Advise
  return { ...risk, ...advice };
}
