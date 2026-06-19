"use client";

import { useState } from "react";

const SAMPLES = [
  "壊れた商品が届きました。こんな対応ならSNSに書きます。ちゃんと返金してください。",
  "予約した時間に席が用意されていませんでした。",
  "弁護士に相談して訴えます。",
];

export function ConversationInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="card">
      <p className="section-title">顧客発話の入力</p>
      <input
        className="text-input"
        value={text}
        placeholder="顧客の発話を入力…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        disabled={disabled}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" onClick={send} disabled={disabled}>
          送信して判定
        </button>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>サンプル:</span>
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            onClick={() => setText(s)}
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            例{i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
