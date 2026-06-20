"use client";

import { useState } from "react";

interface Row {
  id: string;
  name: string;
  sub: string;
}

const SEED_LOCATIONS: Row[] = [
  { id: "loc_1", name: "本店", sub: "東京・新宿" },
  { id: "loc_2", name: "渋谷店", sub: "東京・渋谷" },
];
const SEED_OPERATORS: Row[] = [
  { id: "u_1", name: "山田 太郎", sub: "現場担当 / 本店" },
  { id: "u_2", name: "佐藤 花子", sub: "店長（承認者）/ 渋谷店" },
];

const SUGGEST_MODES = ["OFF", "Text", "Icon", "Digest", "Admin Only"];

// 拡張オプション（今後）— 設計済み・将来実装。拡張性を示すための表示。
const EXTENSIONS = [
  { t: "複数端末リアルタイム同期", d: "現場・上長・本部が同じ案件を同時に見る（Firestoreリスナー）" },
  { t: "LINE / メール通知", d: "高リスク案件の上長通知・顧客への返信下書き" },
  { t: "CRM・外部DB連携", d: "MCP Tool Hub 経由で顧客情報・注文履歴を参照" },
  { t: "音声応答（Gemini Live）", d: "電話・対面のリアルタイム音声対応" },
];

export default function SettingsPage() {
  const [locations, setLocations] = useState<Row[]>(SEED_LOCATIONS);
  const [operators, setOperators] = useState<Row[]>(SEED_OPERATORS);
  const [newLoc, setNewLoc] = useState("");
  const [newOp, setNewOp] = useState("");
  const [mode, setMode] = useState("Text");

  const addLoc = () => {
    if (!newLoc.trim()) return;
    setLocations((p) => [...p, { id: `loc_${Date.now()}`, name: newLoc.trim(), sub: "拠点" }]);
    setNewLoc("");
  };
  const addOp = () => {
    if (!newOp.trim()) return;
    setOperators((p) => [...p, { id: `u_${Date.now()}`, name: newOp.trim(), sub: "現場担当" }]);
    setNewOp("");
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 4 }}>設定</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        複数拠点・複数担当者での運用を前提にした設定です。組織全体で対応品質を統一します。
      </p>

      <div className="grid-2">
        <div className="card">
          <p className="section-title">拠点（複数拠点対応）</p>
          {locations.map((l) => (
            <div className="list-row" key={l.id}>
              <span className="grow">
                <strong>{l.name}</strong> <span className="hint">{l.sub}</span>
              </span>
              <button className="del" onClick={() => setLocations((p) => p.filter((x) => x.id !== l.id))}>✕</button>
            </div>
          ))}
          <div className="input-row" style={{ marginTop: 10 }}>
            <input className="text-input" placeholder="拠点名を追加…" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLoc()} />
            <button className="btn sm" onClick={addLoc}>追加</button>
          </div>
        </div>

        <div className="card">
          <p className="section-title">担当者（複数担当・承認者）</p>
          {operators.map((o) => (
            <div className="list-row" key={o.id}>
              <span className="grow">
                <strong>{o.name}</strong> <span className="hint">{o.sub}</span>
              </span>
              <button className="del" onClick={() => setOperators((p) => p.filter((x) => x.id !== o.id))}>✕</button>
            </div>
          ))}
          <div className="input-row" style={{ marginTop: 10 }}>
            <input className="text-input" placeholder="担当者名を追加…" value={newOp} onChange={(e) => setNewOp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOp()} />
            <button className="btn sm" onClick={addOp}>追加</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">改善提案の表示モード</p>
        <p className="hint" style={{ marginTop: 0 }}>現場負荷にならない範囲で改善提案を出します（控えめに）。</p>
        <select className="text-input" value={mode} onChange={(e) => setMode(e.target.value)} style={{ maxWidth: 280 }}>
          {SUGGEST_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">セキュリティとデータ保護</p>
        <p className="hint" style={{ marginTop: 0 }}>会社ごとにデータを分離し、安全設計で情報漏えいリスクを低減しています。</p>
        {[
          { t: "🔐 組織ごとのデータ分離（マルチテナント）", d: "Firebase認証で組織を識別し、自分の組織のデータにのみアクセスできます。" },
          { t: "🪪 サーバー側でのトークン検証", d: "APIがIDトークンをサーバーで検証して組織を確定。なりすましを防ぎます。" },
          { t: "🗄 Googleインフラに暗号化保存", d: "Firestoreに保管時暗号化で保存。セキュリティルールで他組織からのアクセスを遮断。" },
          { t: "✋ 危険操作は人間承認", d: "返金・法的責任・正式送信などは自動実行せず承認制。" },
          { t: "🔗 改ざん検知できる監査ログ", d: "AI判断と操作をハッシュチェーンで記録し、説明責任を担保。" },
        ].map((s) => (
          <div className="toggle" key={s.t}>
            <div className="label">
              <span className="t">{s.t}</span>
              <div className="d">{s.d}</div>
            </div>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 10 }}>
          ※ 現在はブラウザ単位の匿名認証による分離です。実名アカウント・複数端末での共有は、Googleログイン対応で拡張できます。
        </p>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">拡張オプション（今後）</p>
        <p className="hint" style={{ marginTop: 0 }}>
          設計済みの拡張ポイント。MCP Tool Hub / Firestore / Gemini Live で段階的に有効化できます。
        </p>
        {EXTENSIONS.map((x) => (
          <div className="toggle" key={x.t}>
            <div className="label">
              <span className="t">{x.t}<span className="badge-soon">近日</span></span>
              <div className="d">{x.d}</div>
            </div>
            <div className="switch" aria-disabled title="今後対応" />
          </div>
        ))}
      </div>
    </div>
  );
}
