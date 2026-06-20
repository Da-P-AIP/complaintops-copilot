"use client";

import { useState } from "react";

export function OperatorInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <div className="card">
      <p className="section-title">担当者の対応を記録（AIが評価します）</p>
      <div className="input-row">
        <input
          className="text-input"
          value={text}
          placeholder="実際に顧客へ返した内容を入力…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={disabled}
        />
        <button className="btn" onClick={send} disabled={disabled}>記録</button>
      </div>
    </div>
  );
}
