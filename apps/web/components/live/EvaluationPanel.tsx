import type { Evaluation } from "@/lib/types";

export function EvaluationPanel({ evaluation }: { evaluation: Evaluation | null }) {
  if (!evaluation) return null;
  const ok = evaluation.status === "ok";
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="section-title">担当者の対応 評価</p>
      <div className={ok ? "say" : "forbidden"}>
        <div style={{ fontWeight: 700 }}>{ok ? "✅ 良い対応です" : "⚠️ 改善できる点があります"}</div>
        <div className="r" style={{ color: "var(--muted)" }}>{evaluation.comment}</div>
        {evaluation.issues.length > 0 && (
          <ul className="next">
            {evaluation.issues.map((i, n) => (
              <li key={n}>{i}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
