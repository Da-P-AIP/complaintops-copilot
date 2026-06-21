"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/apiClient";

const FEATURES = [
  { ic: "🛡️", t: "人を守る", d: "顧客を説得するのではなく、対応中の担当者をリアルタイムに守る。" },
  { ic: "🚫", t: "禁忌ストップ", d: "「必ず返金します」等の地雷表現を理由つきで提示し、事故を防ぐ。" },
  { ic: "✋", t: "承認ゲート", d: "返金・法的責任・正式送信は自動実行せず人間承認へ回す。" },
  { ic: "🔗", t: "監査ログ", d: "AI判断と操作をハッシュチェーンで記録し、説明責任を担保。" },
  { ic: "🧠", t: "暗黙知を育てる", d: "対応から学びを抽出→人間が承認→次の助言へ反映。使うほど会社が賢くなる。" },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await api.createCase();
      router.push(`/cases/${c.id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "起動に失敗しました（APIを確認してください）");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <section className="hero">
        <span className="src-tag ai" style={{ marginLeft: 0, fontSize: 12 }}>クレーム対応から始める、社内暗黙知OS</span>
        <h1 style={{ marginTop: 10 }}>
          クレーム対応中の人間を、<br />
          <span className="grad">AIが横で守る。</span>
        </h1>
        <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 14px" }}>
          守りながら、現場の<span className="grad">&ldquo;暗黙知&rdquo;を会社の資産に</span>育てる。
        </p>
        <p className="lead">
          会話を聞き、リスクを読み、禁忌を止め、次の一手を出す——対応中のあなたを守ります。
          さらに一つひとつの対応から「判断のコツ（暗黙知）」を抽出・承認し、社内ルールとして蓄積。
          使うほど会社が賢くなる、クレーム対応から始まる<strong>“暗黙知を育てる社内OS”</strong>です。
        </p>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      </section>

      <Link
        href="/security"
        className="card"
        style={{ display: "block", marginTop: 18, borderColor: "var(--ok)", background: "linear-gradient(180deg, rgba(52,211,153,0.10), var(--bg-2))" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 26 }}>🔐</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 800 }}>組織ごとにデータを分離。安心して使えます。</div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              テナント分離・人間承認・改ざん検知の監査ログ。安全設計の仕組みはこちら。
            </div>
          </div>
          <span style={{ color: "var(--ok)", fontWeight: 700, whiteSpace: "nowrap" }}>仕組みを見る →</span>
        </div>
      </Link>

      {/* 2つの入口：使う（本番） / 練習する */}
      <section className="grid-2" style={{ marginTop: 8 }}>
        <div className="card" style={{ borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent) inset" }}>
          <p className="section-title">① メイン：対応コンソール</p>
          <h3 style={{ margin: "2px 0 8px", fontSize: 20 }}>本番対応も練習も、ここから 🛡</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            会社設定（呼称・禁忌・承認・社内ルール）が判定に反映される<strong>本番対応</strong>と、AIがクレーム客を演じる<strong>練習</strong>を、ひとつの画面で。日々の入口はここです。
          </p>
          <div className="cta-row">
            <Link href="/console" className="btn">対応コンソールを開く →</Link>
            <button className="btn ghost" onClick={quickDemo} disabled={loading}>
              {loading ? "起動中…" : "設定をスキップして試す"}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>初めての方は、まず②の初期設定（約1分）を。</p>
        </div>

        <div className="card">
          <p className="section-title">② はじめての設定（約1分）</p>
          <h3 style={{ margin: "2px 0 8px", fontSize: 20 }}>
            自社の対応環境を整える
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "var(--ok)", border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)", borderRadius: 999, padding: "2px 8px" }}>⚡ 最短1分</span>
          </h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            業種を選ぶ → いくつか質問に答える → 完成。会社名・呼称・禁忌表現・承認ルールが即反映。テーブルに無い業種でもAIがその場でプロファイルを生成します。
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 12px" }}>
            <span className="tag">① 業種を選択</span>
            <span className="tag">② 質問に回答</span>
            <span className="tag">③ 確認して完成</span>
          </div>
          <div className="cta-row">
            <Link href="/setup" className="btn ghost">初期設定から始める →</Link>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <p className="section-title">特長</p>
        <div className="feature-grid" style={{ marginTop: 8 }}>
          {FEATURES.map((f) => (
            <div className="card feature" key={f.t}>
              <div className="ic">{f.ic}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
