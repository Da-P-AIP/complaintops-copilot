"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/apiClient";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await api.createCase();
      router.push(`/cases/${c.id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "起動に失敗しました（APIが起動しているか確認してください）");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: 4 }}>ComplaintOps Copilot</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        クレーム対応中の人間をリアルタイムに守るAIエージェント
      </p>

      <div className="card" style={{ maxWidth: 620, marginTop: 24 }}>
        <p className="section-title">DEMO</p>
        <p>
          新しいクレーム案件を作成して、現場対応画面を開きます。<br />
          顧客の発話を入力すると、AIが危険度・禁忌表現・次アクションをリアルタイム判定します。
        </p>
        <button className="btn" onClick={start} disabled={loading}>
          {loading ? "起動中…" : "クレーム対応を開始する"}
        </button>
        {error && <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
