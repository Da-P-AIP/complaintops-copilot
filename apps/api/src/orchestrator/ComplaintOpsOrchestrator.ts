import type { AnalyzeResult, DetectedRisk, ForbiddenPhrase, RiskLevel, CompanyRules } from "@complaintops/shared";
import { DEFAULT_COMPANY_RULES } from "@complaintops/shared";
import { riskJudgeAgent } from "../agents/riskJudgeAgent";
import { ruleAgent } from "../agents/ruleAgent";
import { advisorAgent } from "../agents/advisorAgent";
import { geminiAnalyze } from "../agents/geminiClient";
import { resolveProfile } from "../domain/industryProfiles";
import type { IndustryProfile } from "@complaintops/shared";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVELS[Math.max(LEVELS.indexOf(a), LEVELS.indexOf(b))] ?? a;
}

function mockAnalyze(text: string, policy: CompanyRules, profile: IndustryProfile, nextStage?: string): AnalyzeResult {
  const risk = riskJudgeAgent(text);
  const forbidden = ruleAgent(risk, policy);
  const advice = advisorAgent(text, risk, forbidden, profile, nextStage);
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
// 助言(say_this)に金銭・補償の確約が混じったら、断定させず人間承認へ回す安全ガード。
const COMMIT_RE = /(返金します|返金いたします|全額返金|必ず.{0,4}返金|無料にします|無料とさせて|代金を?(?:頂戴|いただき|頂き)ません|必ず.{0,4}補償|全額補償)/;
function commitmentGuard(result: AnalyzeResult): AnalyzeResult {
  const hit = result.say_this.some((s) => COMMIT_RE.test(s));
  if (hit) {
    result.approval_required = true;
    result.next_actions = ["⚠️ 助言に金銭・補償の確約あり：断定せず上席の承認へ回す", ...result.next_actions];
  }
  return result;
}

// 承認済みの社内ルール（暗黙知）を助言に注入する。業種一致 or 業種無しのみ。
function withRules(result: AnalyzeResult, policy: CompanyRules): AnalyzeResult {
  commitmentGuard(result);
  const applied = (policy.learned_rules ?? []).filter((r) => !r.industry_id || r.industry_id === policy.industry_id).slice(0, 3);
  if (applied.length > 0) {
    result.next_actions = [...applied.map((r) => `📘 社内ルール: ${r.statement}`), ...result.next_actions];
  }
  return result;
}

export async function analyzeUtterance(text: string, policy: CompanyRules = DEFAULT_COMPANY_RULES, history?: string, nextStage?: string): Promise<AnalyzeResult> {
  const profile = resolveProfile(policy.industry_id, policy);
  const floor = mockAnalyze(text, policy, profile, nextStage);
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) return withRules(floor, policy);
  // 意味検索で選ばれ policy.learned_rules に載った暗黙知を、Geminiの推論プロンプトへも注入する
  // （従来は next_actions への後付け表示のみ。ここで“推論そのもの”に効かせる）。
  const learned = (policy.learned_rules ?? []).map((r) => r.statement);
  try {
    const g = await geminiAnalyze(text, history, profile, learned);
    const detected = new Set<DetectedRisk>([
      ...floor.detected_risks,
      ...((g.detected_risks as DetectedRisk[] | undefined) ?? []),
    ]);
    return withRules({
      risk_level: maxLevel(floor.risk_level, (g.risk_level as RiskLevel | undefined) ?? "low"),
      anger_level: g.anger_level ?? floor.anger_level,
      complaint_type: g.complaint_type ?? floor.complaint_type,
      detected_risks: Array.from(detected),
      supervisor_report_required: floor.supervisor_report_required || g.supervisor_report_required === true,
      approval_required: floor.approval_required || g.approval_required === true,
      say_this: g.say_this && g.say_this.length > 0 ? g.say_this : floor.say_this,
      dont_say_this: mergeForbidden(floor.dont_say_this, g.dont_say_this ?? []),
      next_actions: g.next_actions && g.next_actions.length > 0 ? g.next_actions : floor.next_actions,
    }, policy);
  } catch {
    return withRules(floor, policy);
  }
}
