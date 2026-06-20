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
        <h1>
          クレーム対応中の人間を、<br />
          <span className="grad">AIが横で守る。</span>
        </h1>
        <p className="lead">
          会話を聞き、リスクを読み、禁忌を止め、次の一手を出す。さらに上司報告・承認・残務・監査まで。
          単なる返信生成AIではなく、クレーム対応を安全に完了させる業務AIオペレーション基盤です。
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
        <div className="card">
          <p className="section-title">① 使う（本番フロー）</p>
          <h3 style={{ margin: "2px 0 8px", fontSize: 20 }}>初期設定して、現場対応する</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            AIと対話で会社ルールを作成 → そのまま現場対応画面へ。危険な一言を止め、報告書・クローズまで安全に完了します。
          </p>
          <div className="cta-row">
            <Link href="/setup" className="btn">初期設定から始める</Link>
            <button className="btn ghost" onClick={quickDemo} disabled={loading}>
              {loading ? "起動中…" : "設定をスキップして試す"}
            </button>
          </div>
        </div>

        <div className="card">
          <p className="section-title">② 練習する</p>
          <h3 style={{ margin: "2px 0 8px", fontSize: 20 }}>クレーム対応を練習する</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            AIがクレーム客を演じるシミュレーション。危険度・禁忌・推奨返答を見ながら、選ぶだけで安全な対応を体験できます。
          </p>
          <div className="cta-row">
            <Link href="/simulate" className="btn ghost">練習モードへ →</Link>
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
