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
        <div className="cta-row">
          <Link href="/setup" className="btn">初期設定から始める</Link>
          <button className="btn ghost" onClick={quickDemo} disabled={loading}>
            {loading ? "起動中…" : "デモを今すぐ試す"}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
      </section>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <div className="card feature" key={f.t}>
            <div className="ic">{f.ic}</div>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
