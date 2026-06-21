import type { ConversationEvent } from "@/lib/types";

const WHO: Record<string, string> = {
  customer: "顧客",
  operator: "担当者",
  system: "システム",
};

export function ConversationLog({ events, maxHeight }: { events: ConversationEvent[]; maxHeight?: number }) {
  return (
    <div className="card">
      <p className="section-title">会話ログ（現在の進行）</p>
      <div style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
        {events.length === 0 && <p style={{ color: "var(--muted)" }}>顧客の発話を入力してください。</p>}
        {events.map((e) => (
          <div className="bubble" key={e.id}>
            <div className="who">{WHO[e.speaker] ?? e.speaker}</div>
            <div>{e.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
