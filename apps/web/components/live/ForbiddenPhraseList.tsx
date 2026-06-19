import type { ForbiddenPhrase } from "@complaintops/shared";

export function ForbiddenPhraseList({ items }: { items: ForbiddenPhrase[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="section-title">言ってはいけないこと</p>
      {items.map((f, i) => (
        <div className="forbidden" key={i}>
          <div className="p">× {f.phrase}</div>
          <div className="r">理由：{f.reason}</div>
        </div>
      ))}
    </div>
  );
}
