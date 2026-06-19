"use client";

import { useState } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

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
  const { supported, listening, start, stop } = useSpeechRecognition("ja-JP");

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const toggleMic = () => {
    if (listening) stop();
    else start((t) => setText(t));
  };

  return (
    <div className="card">
      <p className="section-title">顧客発話の入力</p>
      <div className="input-row">
        <input
          className="text-input"
          value={text}
          placeholder={listening ? "聞き取り中… 話しかけてください" : "顧客の発話を入力 / マイクで音声入力…"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={disabled}
        />
        {supported && (
          <button
            type="button"
            className={`mic-btn${listening ? " listening" : ""}`}
            onClick={toggleMic}
            disabled={disabled}
            title={listening ? "停止" : "音声入力"}
            aria-label="音声入力"
          >
            {listening ? "■" : "🎙"}
          </button>
        )}
      </div>
      <div className="input-actions">
        <button className="btn" onClick={send} disabled={disabled}>
          送信して判定
        </button>
        {supported ? (
          <span className="hint">🎙 マイクで音声入力できます（{listening ? "認識中…" : "ja-JP"}）</span>
        ) : (
          <span className="hint">※ 音声入力はChrome/Edge推奨</span>
        )}
      </div>
      <div className="samples">
        <span className="hint">サンプル:</span>
        {SAMPLES.map((s, i) => (
          <button key={i} className="chip" onClick={() => setText(s)}>
            例{i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
