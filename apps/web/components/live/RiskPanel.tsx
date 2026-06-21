import type { AnalyzeResult } from "@/lib/types";
import { RiskBadge } from "../common/RiskBadge";

const RISK_LABEL: Record<string, string> = {
  sns_risk: "SNS拡散リスク",
  refund_possible: "返金要求可能性",
  evidence_missing: "証拠未確認",
  legal_risk: "法的リスク",
  privacy_risk: "個人情報リスク",
  violence_or_threat_risk: "暴言・脅迫",
  product_damage: "商品破損",
  high_anger: "怒りレベル高",
};

export function RiskPanel({ analysis, step }: { analysis: AnalyzeResult | null; step?: number }) {
  return (
    <div className="card">
      <p className="section-title">{step != null && <span className="step-badge">{step}</span>}AI判定</p>
      {!analysis ? (
        <p style={{ color: "var(--muted)" }}>判定待ち</p>
      ) : (
        <>
          <RiskBadge level={analysis.risk_level} />
          <div style={{ marginTop: 12 }}>
            <p className="section-title">検出リスク</p>
            {analysis.detected_risks.length === 0 ? (
              <span className="tag">特になし</span>
            ) : (
              analysis.detected_risks.map((r) => (
                <span className="tag danger" key={r}>
                  {RISK_LABEL[r] ?? r}
                </span>
              ))
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="kv">
              <span className="k">上司報告</span>
              <span>{analysis.supervisor_report_required ? "必要" : "不要"}</span>
            </div>
            <div className="kv">
              <span className="k">承認</span>
              <span>{analysis.approval_required ? "必要（人間承認へ）" : "不要"}</span>
            </div>
            <div className="kv">
              <span className="k">怒りレベル</span>
              <span>{analysis.anger_level}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
