"use client";

import { useState } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

const DEFAULT_SAMPLES = [
  "壊れた商品が届きました。こんな対応ならSNSに書きます。ちゃんと返金してください。",
  "予約した時間に席が用意されていませんでした。",
  "弁護士に相談して訴えます。",
];

export function ConversationInput({
  onSend,
  disabled,
  samples,
  step,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  samples?: string[];
  step?: number;
}) {
  const [text, setText] = useState("");
  const { supported, listening, start, stop } = useSpeechRecognition("ja-JP");
  const list = samples && samples.length > 0 ? samples : DEFAULT_SAMPLES;

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const micClick = () => {
    if (!supported) {
      if (typeof window !== "undefined") window.alert("音声入力は Chrome / Edge でご利用いただけます。");
      return;
    }
    listening ? stop() : start((t) => setText(t));
  };

  return (
    <div className="card">
      <p className="section-title">{step != null && <span className="step-badge">{step}</span>}顧客発話の入力</p>
      <div className="input-row">
        <input
          className="text-input"
          value={text}
          placeholder={listening ? "聞き取り中… 話しかけてください" : "顧客の発話を入力 / マイクで音声入力…"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={disabled}
        />
        <button
          type="button"
          className={`mic-btn${listening ? " listening" : ""}`}
          onClick={micClick}
          disabled={disabled}
          title={supported ? (listening ? "停止" : "音声入力") : "この環境は音声非対応（Chrome/Edge推奨）"}
          aria-label="音声入力"
          style={!supported ? { opacity: 0.5 } : undefined}
        >
          {listening ? "■" : "🎙"}
        </button>
      </div>
      <div className="input-actions">
        <button className="btn" onClick={send} disabled={disabled}>送信して判定</button>
        {supported ? (
          <span className="hint">🎙 マイクで音声入力できます（{listening ? "認識中…" : "ja-JP"}）</span>
        ) : (
          <span className="hint">※ 音声入力はChrome/Edge推奨</span>
        )}
      </div>
      <div className="samples" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
        <span className="hint">サンプル発話（クリックで入力）:</span>
        {list.map((s, i) => (
          <button key={i} className="chip reply" title={s} onClick={() => setText(s)} style={{ textAlign: "left", whiteSpace: "normal" }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
