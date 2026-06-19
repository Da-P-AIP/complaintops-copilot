import type { ComplaintCase, ConversationEvent, Report } from "@complaintops/shared";

const RISK_LABEL: Record<string, string> = {
  sns_risk: "SNS拡散",
  refund_possible: "返金要求",
  evidence_missing: "証拠未確認",
  legal_risk: "法的リスク",
  privacy_risk: "個人情報",
  violence_or_threat_risk: "暴言・脅迫",
  product_damage: "商品破損",
  high_anger: "怒りレベル高",
};

/**
 * Report Agent（モック版 / 02 MVP仕様 7.6・8.10）
 * 会話と最新のAI判定から、確認・編集・保存できる報告書(Markdown)を生成する。
 * 事実・推測・未確認を分けて記録する（07 Safety Policy 2.5）。
 */
export function reportAgent(c: ComplaintCase, events: ConversationEvent[]): Report {
  const customer = events.filter((e) => e.speaker === "customer").map((e) => `- ${e.text}`);
  const r = c.latest_risk;
  const risks = r && r.detected_risks.length > 0 ? r.detected_risks.map((x) => RISK_LABEL[x] ?? x).join("、") : "なし";

  const md = [
    "# クレーム報告書",
    "",
    "## 概要",
    `${r ? `危険度「${r.risk_level}」のクレーム対応。` : "クレーム対応。"}検出リスク：${risks}。`,
    "",
    "## 顧客の主張",
    customer.length > 0 ? customer.join("\n") : "- （記録なし）",
    "",
    "## AIリスク判定",
    r
      ? `- 危険度：${r.risk_level} ／ 怒りレベル：${r.anger_level}\n- 検出リスク：${risks}\n- 上司報告：${r.supervisor_report_required ? "必要" : "不要"} ／ 承認：${r.approval_required ? "必要" : "不要"}`
      : "- 判定なし",
    "",
    "## 未確認事項",
    r && r.detected_risks.includes("evidence_missing")
      ? "- 証拠（注文番号・破損写真・配送状況など）の確認が必要"
      : "- 特記なし",
    "",
    "## 残務・次アクション",
    `- 上司報告：${r?.supervisor_report_required ? "要" : "—"}`,
    `- 返金・補償の承認：${r?.approval_required ? "要（保留中）" : "—"}`,
    "- 顧客への返信内容の確定",
    "",
    "## 再発防止（案）",
    "- 同種クレームの傾向を確認し、必要に応じて工程・手順を見直す",
    "",
    `_generated: ${new Date().toISOString()}_`,
  ].join("\n");

  return { generated_at: new Date().toISOString(), markdown: md };
}
