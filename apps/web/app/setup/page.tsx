"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/apiClient";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import type { JobTemplate, CompanyRules } from "@/lib/types";

const STEPS = ["業種を選ぶ", "ルールを伝える", "確認して開始"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [examples, setExamples] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<JobTemplate | null>(null);
  const [text, setText] = useState("");
  const [rules, setRules] = useState<CompanyRules | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supported, listening, start, stop } = useSpeechRecognition("ja-JP");

  useEffect(() => {
    api
      .getJobTypes()
      .then((d) => {
        setTemplates(d.templates);
        setExamples(d.examples);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "テンプレート取得に失敗（APIを確認）"));
  }, []);

  const pick = (t: JobTemplate) => {
    setSelected(t);
    setText(examples[t.id] ?? "");
    setStep(2);
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.runSetupInterview(selected?.label ?? "EC", text);
      setRules(r);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ルール生成に失敗");
    } finally {
      setBusy(false);
    }
  };

  const startCase = async () => {
    setBusy(true);
    try {
      const c = await api.createCase();
      router.push(`/cases/${c.id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "対応開始に失敗");
      setBusy(false);
    }
  };

  const toggleMic = () => (listening ? stop() : start((t) => setText(t)));

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <h2 style={{ marginBottom: 4 }}>初期設定チュートリアル</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        会社のクレーム対応ルールをAIと対話で作ります。フォームを埋めるのではなく、AIに業務を教えるイメージです。
      </p>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`step${step === i + 1 ? " active" : ""}`}>
              <span className="n">{i + 1}</span>
              {s}
            </div>
            {i < STEPS.length - 1 && <span className="sep">→</span>}
          </div>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {step === 1 && (
        <div className="tpl-grid">
          {templates.length === 0 && <p style={{ color: "var(--muted)" }}>読み込み中…</p>}
          {templates.map((t) => (
            <button key={t.id} className={`tpl${selected?.id === t.id ? " selected" : ""}`} onClick={() => pick(t)}>
              <h3>{t.label}</h3>
              <div className="meta">仕事単位: {t.work_items.join("・")}</div>
              <div className="meta">よくある苦情: {t.common_complaints.slice(0, 3).join("・")} …</div>
              <div className="meta">必須確認: {t.required_checks.slice(0, 3).join("・")} …</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <p className="section-title">{selected?.label}｜会社のルールを自然文で教えてください</p>
          <div className="input-row">
            <textarea
              className="text-input"
              value={text}
              placeholder="例）うちは通販。返金は店長承認。SNSに書くと言われたら本部へ通知…"
              onChange={(e) => setText(e.target.value)}
            />
            {supported && (
              <button className={`mic-btn${listening ? " listening" : ""}`} onClick={toggleMic} title="音声入力">
                {listening ? "■" : "🎙"}
              </button>
            )}
          </div>
          <div className="input-actions">
            <button className="btn" onClick={generate} disabled={busy || !text.trim()}>
              {busy ? "生成中…" : "この内容でルールを生成"}
            </button>
            <button className="chip" onClick={() => setText(examples[selected?.id ?? "ec"] ?? "")}>例文を入れる</button>
            <button className="btn ghost sm" onClick={() => setStep(1)}>← 業種を選び直す</button>
            <span className="hint">{supported ? "🎙 音声入力できます" : "※音声はChrome/Edge推奨"}</span>
          </div>
        </div>
      )}

      {step === 3 && rules && (
        <div className="card">
          <p className="section-title">生成された会社ルール（このまま対応に反映されます）</p>
          <div className="kv"><span className="k">業種</span><span>{rules.business_type}</span></div>
          <div className="kv"><span className="k">トーン</span><span>{rules.tone}</span></div>
          <div style={{ marginTop: 10 }}>
            <p className="section-title">人間承認が必要</p>
            {rules.approval_required.map((a) => <span className="tag" key={a}>{a}</span>)}
          </div>
          <div style={{ marginTop: 12 }}>
            <p className="section-title">禁忌表現（言ってはいけないこと）</p>
            {rules.forbidden_phrases.map((f) => (
              <div className="forbidden" key={f.phrase}>
                <div className="p">× {f.phrase}</div>
                <div className="r">理由：{f.reason}</div>
              </div>
            ))}
          </div>
          <div className="input-actions">
            <button className="btn" onClick={startCase} disabled={busy}>
              {busy ? "起動中…" : "この設定で対応を開始する →"}
            </button>
            <button className="btn ghost sm" onClick={() => setStep(2)}>← 修正する</button>
          </div>
        </div>
      )}
    </div>
  );
}
