import type {
  RiskResult,
  DetectedRisk,
  RiskLevel,
  AngerLevel,
  ComplaintType,
} from "@complaintops/shared";
import { RISK_KEYWORDS } from "@complaintops/shared";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

function includesAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Risk Judge Agent（モック版 / 15プロンプト.txt のルール）
 * - SNS / 拡散 → sns_risk, risk_level=high
 * - 返金        → refund_possible, approval_required
 * - 壊れ / 破損 → product_damage, evidence_missing
 * - 弁護士 / 訴え → legal_risk, risk_level=critical
 * 後で Gemini 呼び出しに差し替えても、戻り値の形（RiskResult）は変えない。
 */
export function riskJudgeAgent(text: string): RiskResult {
  const risks = new Set<DetectedRisk>();
  let severity = 0; // 0:low 1:medium 2:high 3:critical
  let anger: AngerLevel = "low";
  let complaintType: ComplaintType = "other";
  let approval = false;
  let report = false;

  const raise = (n: number) => {
    if (n > severity) severity = n;
  };

  if (includesAny(text, RISK_KEYWORDS.sns)) {
    risks.add("sns_risk");
    raise(2);
    report = true;
    anger = "high";
  }
  if (includesAny(text, RISK_KEYWORDS.refund)) {
    risks.add("refund_possible");
    approval = true;
    raise(2);
    if (complaintType === "other") complaintType = "refund";
  }
  if (includesAny(text, RISK_KEYWORDS.damage)) {
    risks.add("product_damage");
    risks.add("evidence_missing");
    complaintType = "product_damage";
    raise(1);
  }
  if (includesAny(text, RISK_KEYWORDS.legal)) {
    risks.add("legal_risk");
    raise(3);
    report = true;
  }
  if (includesAny(text, RISK_KEYWORDS.threat)) {
    risks.add("violence_or_threat_risk");
    raise(3);
    report = true;
    anger = "high";
  }

  // 簡易な怒りレベル推定
  if (text.includes("最悪") || text.includes("ふざけ") || (text.match(/！|!/g)?.length ?? 0) >= 2) {
    anger = anger === "high" ? "high" : "medium";
  }
  if (anger === "high") risks.add("high_anger");

  // high 以上は上司報告を必須にする（01 設計思想 6.3）
  if (severity >= 2) report = true;
  const level: RiskLevel = LEVELS[severity] ?? "low";

  return {
    risk_level: level,
    anger_level: anger,
    complaint_type: complaintType,
    detected_risks: Array.from(risks),
    supervisor_report_required: report,
    approval_required: approval,
  };
}
