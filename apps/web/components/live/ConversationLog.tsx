import type { ConversationEvent } from "@complaintops/shared";

const WHO: Record<string, string> = {
  customer: "顧客",
  operator: "担当者",
  system: "システム",
};

export function ConversationLog({ events }: { events: ConversationEvent[] }) {
  return (
    <div className="card">
      <p className="section-title">会話ログ</p>
      {events.length === 0 && (
        <p style={{ color: "var(--muted)" }}>顧客の発話を入力してください。</p>
      )}
      {events.map((e) => (
        <div className="bubble" key={e.id}>
          <div className="who">{WHO[e.speaker] ?? e.speaker}</div>
          <div>{e.text}</div>
        </div>
      ))}
    </div>
  );
}
