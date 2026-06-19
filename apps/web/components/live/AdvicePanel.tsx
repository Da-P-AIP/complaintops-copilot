import type { AnalyzeResult } from "@complaintops/shared";
import { ForbiddenPhraseList } from "./ForbiddenPhraseList";

export function AdvicePanel({ analysis }: { analysis: AnalyzeResult | null }) {
  return (
    <div className="card">
      <p className="section-title">助言</p>
      {!analysis ? (
        <p style={{ color: "var(--muted)" }}>判定待ち</p>
      ) : (
        <>
          <div>
            <p className="section-title">今言うべきこと</p>
            {analysis.say_this.map((s, i) => (
              <div className="say" key={i}>
                {s}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <ForbiddenPhraseList items={analysis.dont_say_this} />
          </div>

          <div style={{ marginTop: 10 }}>
            <p className="section-title">次アクション</p>
            <ul className="next">
              {analysis.next_actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
