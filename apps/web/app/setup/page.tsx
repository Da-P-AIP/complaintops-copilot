"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/apiClient";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import type { JobTemplate, CompanyRules } from "@/lib/types";

type QKind = "single" | "multi" | "free";
interface Q {
  id: string;
  q: string;
  kind: QKind;
  source?: "api" | "template_complaints";
}

// 簡易版の決定木フロー（業種選択のあとに枝を辿って会社データを絞り込む）
const QUESTIONS: Q[] = [
  { id: "form", q: "御社の形態・業態はどれですか？", kind: "single", source: "api" },
  { id: "company", q: "御社名を教えてください", kind: "free" },
  { id: "operator", q: "主な対応担当者のお名前は？", kind: "free" },
  { id: "complaints", q: "よくある苦情はどれですか？（複数選択可）", kind: "multi", source: "template_complaints" },
  { id: "approver", q: "返金・補償の承認は誰が行いますか？", kind: "single", source: "api" },
  { id: "notify", q: "SNS拡散など高リスク時、誰に通知しますか？", kind: "single", source: "api" },
];

export default function SetupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"industry" | "qa" | "review">("industry");
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [industry, setIndustry] = useState<JobTemplate | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<string[]>([]);
  const [optSource, setOptSource] = useState<"gemini" | "deterministic" | "">("");
  const [free, setFree] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [rules, setRules] = useState<CompanyRules | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supported, listening, start, stop } = useSpeechRecognition("ja-JP");

  useEffect(() => {
    api.getJobTypes().then((d) => setTemplates(d.templates)).catch((e) =>
      setError(e instanceof Error ? e.message : "テンプレート取得に失敗（APIを確認）"),
    );
  }, []);

  const q = QUESTIONS[idx];

  const loadOptions = async (question: Q, tmpl: JobTemplate | null) => {
    setOptions([]);
    setOptSource("");
    if (question.source === "template_complaints") {
      setOptions(tmpl?.common_complaints ?? []);
    } else if (question.source === "api") {
      try {
        const r = await api.getInterviewOptions(question.id, { industry_id: tmpl?.id ?? "" });
        setOptions(r.choices);
        setOptSource(r.source);
      } catch {
        setOptions([]);
      }
    }
  };

  const pickIndustry = async (t: JobTemplate) => {
    setIndustry(t);
    setAnswers({ industry: t.label, industry_id: t.id });
    setPhase("qa");
    setIdx(0);
    setFree("");
    setMulti([]);
    await loadOptions(QUESTIONS[0], t);
  };

  const goNext = async (value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setFree("");
    setMulti([]);
    if (idx < QUESTIONS.length - 1) {
      const ni = idx + 1;
      setIdx(ni);
      await loadOptions(QUESTIONS[ni], industry);
    } else {
      await finalize(next);
    }
  };

  const finalize = async (a: Record<string, string>) => {
    setBusy(true);
    setError(null);
    const text = `業種:${a.industry}（${a.form ?? ""}）。会社名:${a.company ?? ""}。よくある苦情:${a.complaints ?? ""}。返金・補償の承認は${a.approver ?? ""}。高リスク時は${a.notify ?? ""}。`;
    try {
      const r = await api.runSetupInterview({
        business_type: industry?.label ?? "EC",
        text,
        company_name: a.company,
        industry_id: industry?.id,
        operator_name: a.operator,
      });
      setRules(r);
      setPhase("review");
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

  const goBack = async () => {
    setFree("");
    setMulti([]);
    if (idx === 0) {
      setPhase("industry");
      return;
    }
    const pi = idx - 1;
    setIdx(pi);
    await loadOptions(QUESTIONS[pi], industry);
  };

  const toggleMic = () => (listening ? stop() : start((t) => setFree(t)));
  const toggleMulti = (c: string) => setMulti((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const progress = phase === "industry" ? 0 : phase === "review" ? QUESTIONS.length + 1 : idx + 1;

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      <h2 style={{ marginBottom: 4 }}>初期設定チュートリアル</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        AIが質問ごとに選択肢を出すので、選ぶだけで会社のルールが固まります（自由記述・音声もOK）。
      </p>

      <div className="steps">
        <div className={`step${phase === "industry" ? " active" : ""}`}><span className="n">1</span>業種</div>
        <span className="sep">→</span>
        <div className={`step${phase === "qa" ? " active" : ""}`}><span className="n">2</span>質問に答える（{Math.min(progress, QUESTIONS.length)}/{QUESTIONS.length}）</div>
        <span className="sep">→</span>
        <div className={`step${phase === "review" ? " active" : ""}`}><span className="n">3</span>確認して開始</div>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {phase === "industry" && (
        <div className="tpl-grid">
          {templates.length === 0 && <p style={{ color: "var(--muted)" }}>読み込み中…</p>}
          {templates.map((t) => (
            <button key={t.id} className="tpl" onClick={() => pickIndustry(t)}>
              <h3>{t.label}</h3>
              <div className="meta">仕事単位: {t.work_items.join("・")}</div>
              <div className="meta">よくある苦情: {t.common_complaints.slice(0, 3).join("・")} …</div>
            </button>
          ))}
        </div>
      )}

      {phase === "qa" && q && (
        <div className="card">
          <div className="q-title">
            {q.q}
            {q.source === "api" && optSource && (
              <span className={`src-tag${optSource === "gemini" ? " ai" : ""}`}>
                {optSource === "gemini" ? "AI生成" : "候補"}
              </span>
            )}
          </div>

          {(q.kind === "single") && (
            <div className="choices">
              {options.map((c) => (
                <button key={c} className="choice" onClick={() => goNext(c)}>{c}</button>
              ))}
            </div>
          )}

          {q.kind === "multi" && (
            <>
              <div className="choices">
                {options.map((c) => (
                  <button key={c} className={`choice${multi.includes(c) ? " sel" : ""}`} onClick={() => toggleMulti(c)}>{c}</button>
                ))}
              </div>
              <div className="input-actions">
                <button className="btn" onClick={() => goNext(multi.join("、") || free.trim())} disabled={multi.length === 0 && !free.trim()}>次へ</button>
              </div>
            </>
          )}

          <div className="input-row" style={{ marginTop: 8 }}>
            <input
              className="text-input"
              value={free}
              placeholder={q.kind === "free" ? "ここに入力 / マイクで音声入力…" : "選択肢にない場合は自由記述…"}
              onChange={(e) => setFree(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && free.trim() && goNext(free.trim())}
            />
            {supported && (
              <button className={`mic-btn${listening ? " listening" : ""}`} onClick={toggleMic} title="音声入力">
                {listening ? "■" : "🎙"}
              </button>
            )}
            {(q.kind === "free" || q.kind === "single") && (
              <button className="btn" onClick={() => free.trim() && goNext(free.trim())} disabled={!free.trim()}>次へ</button>
            )}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>{supported ? "🎙 音声入力できます" : "※音声はChrome/Edge推奨"}</p>
          <div className="input-actions" style={{ marginTop: 4 }}>
            <button className="btn ghost sm" onClick={goBack}>
              {idx === 0 ? "← 業種選択に戻る" : "← 前の質問に戻る"}
            </button>
          </div>
        </div>
      )}

      {phase === "review" && rules && (
        <div className="card">
          <p className="section-title">生成された会社ルール（このまま対応に反映されます）</p>
          <div className="kv"><span className="k">業種</span><span>{answers.industry}（{answers.form}）</span></div>
          <div className="kv"><span className="k">会社名</span><span>{answers.company || "—"}</span></div>
          <div className="kv"><span className="k">トーン</span><span>{rules.tone}</span></div>
          <div style={{ marginTop: 10 }}>
            <p className="section-title">人間承認が必要</p>
            {rules.approval_required.map((a) => <span className="tag" key={a}>{a}</span>)}
          </div>
          <div style={{ marginTop: 12 }}>
            <p className="section-title">禁忌表現（言ってはいけないこと）</p>
            {rules.forbidden_phrases.map((f) => (
              <div className="forbidden" key={f.phrase}><div className="p">× {f.phrase}</div><div className="r">理由：{f.reason}</div></div>
            ))}
          </div>
          <div className="input-actions">
            <button className="btn" onClick={startCase} disabled={busy}>{busy ? "起動中…" : "この設定で対応を開始する →"}</button>
            <button className="btn ghost sm" onClick={() => { setPhase("industry"); setAnswers({}); setIdx(0); }}>← 最初からやり直す</button>
          </div>
        </div>
      )}
    </div>
  );
}
