"use client";

import { useState } from "react";

export function OperatorInput({
  onSend,
  disabled,
  step,
  suggestions,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  step?: number;
  suggestions?: string[];
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
      <p className="section-title">{step != null && <span className="step-badge">{step}</span>}担当者の対応を記録（AIが評価します）</p>
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
      {suggestions && suggestions.length > 0 && (
        <div className="samples" style={{ flexDirection: "column", alignItems: "stretch", gap: 6, marginTop: 10 }}>
          <span className="hint">推奨返答から選ぶ（タップで入力 → 必要なら編集して「記録」）:</span>
          {suggestions.map((s, i) => (
            <button key={i} className="chip reply" title={s} onClick={() => setText(s)} style={{ textAlign: "left", whiteSpace: "normal" }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
