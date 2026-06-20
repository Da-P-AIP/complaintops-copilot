import type { FlowState } from "@/lib/types";

const STAGE_HINT: Record<string, string> = {
  acknowledge: "まず謝罪・共感を示す",
  factfind: "事実を具体的に確認する",
  propose: "対応方針・代替案を提示する（確約はしない）",
  close: "記録・再発防止を伝えて合意する",
};

export function FlowPanel({ flow, resolved }: { flow: FlowState | null; resolved?: boolean }) {
  if (!flow) return null;
  const done = flow.stages.filter((s) => s.done).length;
  const isResolved = resolved || flow.resolved;
  return (
    <div className="card">
      <p className="section-title">対応フロー（{done}/{flow.stages.length}）</p>
      {flow.stages.map((s) => (
        <div className="toggle" key={s.key}>
          <div className="label">
            <span className="t" style={{ color: s.done ? "var(--ok)" : "var(--muted)" }}>{s.done ? "✅" : "⬜"} {s.label}</span>
          </div>
        </div>
      ))}
      {isResolved ? (
        <p style={{ color: "var(--ok)", fontWeight: 800, marginTop: 10 }}>🎉 クレーム対応 完了（解決）</p>
      ) : (
        <p className="hint" style={{ marginTop: 10 }}>次のおすすめ: {STAGE_HINT[flow.next_stage] ?? "対応を進める"}</p>
      )}
    </div>
  );
}
