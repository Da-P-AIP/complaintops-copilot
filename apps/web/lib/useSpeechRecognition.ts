"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ブラウザの音声認識（Web Speech API）。コスト0・クライアント完結。
 * Chrome/Edge は webkitSpeechRecognition で日本語(ja-JP)認識が可能。
 * 非対応ブラウザでは supported=false（呼び出し側でマイクボタンを隠す）。
 */
export function useSpeechRecognition(lang = "ja-JP") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const start = useCallback(
    (onResult: (text: string) => void) => {
      if (typeof window === "undefined") return;
      const SR =
        (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
          .SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim += t;
        }
        onResult((finalText + interim).trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    },
    [lang],
  );

  const stop = useCallback(() => {
    (recRef.current as { stop?: () => void } | null)?.stop?.();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}
