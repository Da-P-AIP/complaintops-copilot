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
 * Report Agent（モック版）。会話・AI判定・担当者の対応から報告書(Markdown)を生成。
 * 「評価・改善点」欄は担当者が編集して書類に仕上げる前提。
 */
export function reportAgent(c: ComplaintCase, events: ConversationEvent[]): Report {
  const customer = events.filter((e) => e.speaker === "customer").map((e) => `- ${e.text}`);
  const operator = events.filter((e) => e.speaker === "operator").map((e) => `- ${e.text}`);
  const r = c.latest_risk;
  const risks = r && r.detected_risks.length > 0 ? r.detected_risks.map((x) => RISK_LABEL[x] ?? x).join("、") : "なし";
  const title = c.case_no ? `# クレーム報告書 No.${c.case_no}` : "# クレーム報告書";

  const md = [
    title,
    "",
    "## 概要",
    `${r ? `危険度「${r.risk_level}」のクレーム対応。` : "クレーム対応。"}検出リスク：${risks}。`,
    "",
    "## 顧客の主張",
    customer.length > 0 ? customer.join("\n") : "- （記録なし）",
    "",
    "## 担当者の対応",
    operator.length > 0 ? operator.join("\n") : "- （記録なし。対応内容を記入してください）",
    "",
    "## AIリスク判定",
    r
      ? `- 危険度：${r.risk_level} ／ 怒りレベル：${r.anger_level}\n- 検出リスク：${risks}\n- 上司報告：${r.supervisor_report_required ? "必要" : "不要"} ／ 承認：${r.approval_required ? "必要" : "不要"}`
      : "- 判定なし",
    "",
    "## 未確認事項",
    r && r.detected_risks.includes("evidence_missing") ? "- 証拠（注文番号・破損写真・配送状況など）の確認が必要" : "- 特記なし",
    "",
    "## 残務・次アクション",
    `- 上司報告：${r?.supervisor_report_required ? "要" : "—"}`,
    `- 返金・補償の承認：${r?.approval_required ? "要（保留中）" : "—"}`,
    "- 顧客への返信内容の確定",
    "",
    "## 評価・改善点（編集してください）",
    "- 良かった点：",
    "- 改善できる点：",
    "- 次回への申し送り：",
    "",
    "## 再発防止（案）",
    "- 同種クレームの傾向を確認し、必要に応じて工程・手順を見直す",
    "",
    `_generated: ${new Date().toISOString()}_`,
  ].join("\n");

  return { generated_at: new Date().toISOString(), markdown: md };
}
