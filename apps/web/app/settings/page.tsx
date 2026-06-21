"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient";
import { industryOf } from "@/lib/industry";
import type { CompanyRules } from "@/lib/types";

interface Row {
  id: string;
  name: string;
  sub: string;
}

const SUGGEST_MODES = ["OFF", "Text", "Icon", "Digest", "Admin Only"];

const DONE = [
  "リアルタイム判定（危険度・禁忌・次アクション）",
  "承認ゲート / 禁忌ストップ / Overreach",
  "対応フロー4ステップ（達成基準・解決ゴール）",
  "暗黙知サイクル（学び抽出→承認→助言へ活用）",
  "業種プロファイル（呼称・特性／未知業種はAI生成）",
  "報告書生成・クローズゲート",
  "初期設定ウィザード / 練習シミュレーション",
  "管理者ダッシュボード・案件履歴・監査ログ閲覧",
  "テナント分離（Firebase認証＋Firestore）",
  "音声入力（Web Speech API）",
];

const EXTENSIONS = [
  { t: "サブチャット・アシスト（AIナビ会話）", d: "画面右に常駐するAIナビ。「次に何をすればいい？」と聞くと操作を案内し、チャットに打った内容をそのまま顧客発話・担当者対応の入力欄へ反映。新人でも迷わず操作できます。" },
  { t: "上司承認画面（Approval Gate）", d: "AIが承認必要と判定した案件を、上司が承認・差し戻し・法務へ回せる画面。" },
  { t: "残務チケット管理", d: "残務を一覧化し、担当・期限・種別で管理。抜け漏れを防ぐ。" },
  { t: "PDCA・傾向分析（複数案件）", d: "複数案件の傾向から再発防止を提案。クロス案件の分析。" },
  { t: "役割・権限管理（RBAC）", d: "現場 / 上長 / 管理者でできる操作を制御。" },
  { t: "多言語クレーム対応", d: "外国語のクレームを解析し、日本語で助言。インバウンド対応に。" },
  { t: "拠点・担当者の永続化／部署切替", d: "拠点・担当者・承認者をFirestoreに保存し、部署（ワークスペース）ごとに会社ルール・案件・暗黙知を分離。" },
  { t: "複数端末リアルタイム同期", d: "現場・上長・本部が同じ案件を同時に見る（Firestoreリスナー）。" },
  { t: "LINE / メール通知", d: "高リスク案件の上長通知・顧客への返信下書き。" },
  { t: "音声応答（Gemini Live）", d: "電話・対面のリアルタイム音声対応。" },
];

const MCP_TOOLS = [
  { t: "会計・経理ソフト連携", d: "freee / マネーフォワード / 弥生 / 奉行・大臣シリーズ など。返金・補償の経理処理を連携。" },
  { t: "グループウェア連携", d: "サイボウズ Office / kintone。上司報告・承認申請をワークフローに連携。" },
  { t: "社内データ連携", d: "Microsoft 365 / SharePoint / Access。社内手順書・台帳を参照。" },
  { t: "顧客DB・CRM連携", d: "Salesforce / 各種CRM。顧客情報・取引履歴をその場で参照。" },
  { t: "チャット通知連携", d: "Slack / Microsoft Teams。高リスク案件を担当者・上長へ即時エスカレーション。" },
];

export default function SettingsPage() {
  const [policy, setPolicy] = useState<CompanyRules | null>(null);
  const [rulesCount, setRulesCount] = useState(0);
  const [locations, setLocations] = useState<Row[]>([]);
  const [operators, setOperators] = useState<Row[]>([]);
  const [newLoc, setNewLoc] = useState("");
  const [newOp, setNewOp] = useState("");
  const [mode, setMode] = useState("Text");

  useEffect(() => {
    api
      .getActivePolicy()
      .then((p) => {
        setPolicy(p);
        const ind = industryOf(p.industry_id);
        if (p.company_name) setLocations([{ id: "loc_main", name: p.company_name, sub: `${ind.icon} ${ind.label}・主拠点` }]);
        if (p.operator_name) setOperators([{ id: "op_main", name: p.operator_name, sub: `現場担当 / ${p.company_name || "自社"}` }]);
      })
      .catch(() => {});
    api.listRules("approved").then((r) => setRulesCount(r.length)).catch(() => {});
  }, []);

  const industry = industryOf(policy?.industry_id);

  const addLoc = () => {
    if (!newLoc.trim()) return;
    setLocations((p) => [...p, { id: `loc_${Date.now()}`, name: newLoc.trim(), sub: "拠点（未保存）" }]);
    setNewLoc("");
  };
  const addOp = () => {
    if (!newOp.trim()) return;
    setOperators((p) => [...p, { id: `u_${Date.now()}`, name: newOp.trim(), sub: "現場担当（未保存）" }]);
    setNewOp("");
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 4 }}>設定</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        複数拠点・複数担当者での運用を前提にした設定です。組織全体で対応品質を統一します。
      </p>

      {/* 現在の会社設定：初期設定で生成された実データと連動 */}
      <div className="card" style={{ borderLeft: `4px solid ${industry.color}` }}>
        <p className="section-title">現在の会社設定（初期設定で生成・現場対応に反映中）</p>
        {!policy ? (
          <p className="hint">読み込み中…（未設定の場合は「初期設定」から作成してください）</p>
        ) : (
          <>
            <div className="kv"><span className="k">会社名</span><span>{policy.company_name || "未設定"}</span></div>
            <div className="kv"><span className="k">業種</span><span>{industry.icon} {industry.label}{policy.business_type ? `（${policy.business_type}）` : ""}</span></div>
            <div className="kv"><span className="k">担当者</span><span>{policy.operator_name || "未設定"}</span></div>
            <div className="kv"><span className="k">トーン</span><span>{policy.tone}</span></div>
            <div className="kv"><span className="k">禁忌表現</span><span>{policy.forbidden_phrases.length} 件</span></div>
            <div className="kv"><span className="k">人間承認</span><span>{policy.approval_required.length} 項目</span></div>
            <div className="kv"><span className="k">学習済み社内ルール</span><span>{rulesCount} 件（承認済み）</span></div>
            <p className="hint" style={{ marginTop: 6 }}>変更するには「初期設定」をやり直してください。下の拠点・担当者はこの設定から表示しています。</p>
          </>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <p className="section-title">拠点（複数拠点対応）</p>
          {locations.length === 0 && <p className="hint">初期設定で会社名を登録すると表示されます。</p>}
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
          <p className="hint" style={{ marginTop: 6 }}>※ 追加分の永続化・部署切替は今後対応（ロードマップ）。</p>
        </div>

        <div className="card">
          <p className="section-title">担当者（複数担当・承認者）</p>
          {operators.length === 0 && <p className="hint">初期設定で担当者を登録すると表示されます。</p>}
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
          <p className="hint" style={{ marginTop: 6 }}>※ 追加分の永続化・権限管理(RBAC)は今後対応（ロードマップ）。</p>
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
        <p className="section-title">実装済みの主な機能</p>
        <div>
          {DONE.map((t) => (
            <span className="tag" key={t} style={{ margin: "3px 6px 3px 0", background: "rgba(52,211,153,0.14)", color: "#86efac" }}>✅ {t}</span>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">機能ロードマップ（実装可能・順次）</p>
        <p className="hint" style={{ marginTop: 0 }}>
          設計書に基づく実装可能な機能群。現在のスタック（Next.js / Cloud Run / Firestore / Gemini / MCP）で段階的に追加できます。
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

      <div className="card" style={{ marginTop: 18 }}>
        <p className="section-title">外部連携（MCP・実装可能）</p>
        <p className="hint" style={{ marginTop: 0 }}>
          MCP（Model Context Protocol）Tool Hub 経由で、会計・グループウェア・顧客DBと連携できます（未実装）。クレーム対応に必要な情報をその場で参照・記録します。
        </p>
        {MCP_TOOLS.map((x) => (
          <div className="toggle" key={x.t}>
            <div className="label">
              <span className="t">{x.t}<span className="badge-soon">MCP</span></span>
              <div className="d">{x.d}</div>
            </div>
            <div className="switch" aria-disabled title="MCPで実装可能" />
          </div>
        ))}
      </div>
    </div>
  );
}
