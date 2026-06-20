import type { AnalyzeResult } from "@/lib/types";

function suggest(a: AnalyzeResult): { level: string; msg: string } {
  const r = a.detected_risks;
  if (r.includes("legal_risk"))
    return { level: "高", msg: "法的リスクの示唆があります。法務エスカレーションのフローを明確化しておくと、初動が安全になります。" };
  if (r.includes("sns_risk"))
    return { level: "中", msg: "SNS拡散リスクがあります。広報・本部への共有手順を整備すると、炎上時の初動が安定します。" };
  if (r.includes("product_damage"))
    return { level: "中", msg: "商品破損のクレームです。梱包・検品工程の見直しチケットを作成すると、再発防止につながります。" };
  if (r.includes("evidence_missing"))
    return { level: "低", msg: "口頭だけでは情報の抜けが起きやすい内容です。報告書を作成すると、上司確認・次回対応・再発防止がしやすくなります。" };
  return { level: "低", msg: "大きなリスクは検出されていません。対応内容を記録し、次回の参考にしましょう。" };
}

export function ImprovementPanel({ analysis }: { analysis: AnalyzeResult | null }) {
  if (!analysis) return null;
  const s = suggest(analysis);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="section-title">改善提案（PDCAの入口・控えめ表示）</p>
      <div className="say" style={{ borderLeftColor: "var(--accent-2)", background: "rgba(129,140,248,0.08)" }}>
        💡 {s.msg}
        <div className="hint" style={{ marginTop: 6 }}>重要度: {s.level}・チケット化候補</div>
      </div>
    </div>
  );
}
