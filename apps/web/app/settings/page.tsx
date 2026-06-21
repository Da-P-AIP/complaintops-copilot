"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient";
import { industryOf } from "@/lib/industry";
import type { CompanyRules, KnowledgeRule } from "@/lib/types";

interface Row {
  id: string;
  name: string;
  sub: string;
}

const SUGGEST_MODES = ["OFF", "Text", "Icon", "Digest", "Admin Only"];
const RULE_CATS = ["事実確認", "エスカレーション", "顧客対応", "補償判断", "再発防止", "その他"];

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

// 社内暗黙知OS の拡張ロードマップ（未実装・設計済み）
const TACIT_ROADMAP = [
  { t: "作業履歴からの暗黙知 自動抽出", d: "操作ログ・チャット・日報などからAIが判断パターンを自動発見。手入力に頼らず、現場の型が貯まる。" },
  { t: "暗黙知マップ（ダッシュボード）", d: "カテゴリ別に蓄積量・活用回数・鮮度をヒートマップ化。組織知がどこにあるかを一望。" },
  { t: "横断分析でルール自動発見", d: "複数案件をクラスタリングし「共通の型」を提案。個別対応の背後の法則を可視化。" },
  { t: "鮮度・陳腐化の検知", d: "使われなくなったルールを自動でレビュー提案（イベント駆動で再評価。タイマー駆動はしない）。" },
  { t: "競合・重複ルールの統合", d: "矛盾するルールをAIが指摘し、まとめて整理。ナレッジの肥大化を防ぐ。" },
  { t: "ベテラン⇄新人 スキル移転メトリクス", d: "属人化スコア・継承率を可視化。誰の暗黙知が組織に移ったかを測る。" },
  { t: "根拠トレーサビリティ", d: "各ルールが「どの案件から生まれたか」を辿れる。説明責任と再評価の土台。" },
  { t: "部署横断の全社ナレッジ統合", d: "部署ごとの暗黙知を社内暗黙知OSへ集約。クレーム対応を入口に全業務へ。" },
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
  const [rules, setRules] = useState<KnowledgeRule[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [operators, setOperators] = useState<Row[]>([]);
  const [newLoc, setNewLoc] = useState("");
  const [newOp, setNewOp] = useState("");
  const [newStmt, setNewStmt] = useState("");
  const [newCat, setNewCat] = useState("顧客対応");
  const [mode, setMode] = useState("Text");
  const [msg, setMsg] = useState("");

  const loadRules = () => api.listRules("approved").then(setRules).catch(() => {});
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
    loadRules();
  }, []);

  const industry = industryOf(policy?.industry_id);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const editRow = (setList: React.Dispatch<React.SetStateAction<Row[]>>, id: string, name: string) =>
    setList((p) => p.map((r) => (r.id === id ? { ...r, name } : r)));

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

  const saveCompany = async () => {
    const main = locations.find((l) => l.id === "loc_main");
    if (!main) return;
    try { const p = await api.updatePolicy({ company_name: main.name.trim() }); setPolicy(p); flash("会社名を保存しました ✓"); }
    catch (e) { flash(e instanceof Error ? e.message : "保存に失敗"); }
  };
  const saveOperator = async () => {
    const main = operators.find((o) => o.id === "op_main");
    if (!main) return;
    try { const p = await api.updatePolicy({ operator_name: main.name.trim() }); setPolicy(p); flash("担当者を保存しました ✓"); }
    catch (e) { flash(e instanceof Error ? e.message : "保存に失敗"); }
  };

  const addRule = async () => {
    if (!newStmt.trim()) return;
    try {
      await api.createRule({ statement: newStmt.trim(), category: newCat, industry_id: policy?.industry_id });
      setNewStmt("");
      await loadRules();
      flash("社内ルールを追加しました ✓");
    } catch (e) { flash(e instanceof Error ? e.message : "追加に失敗"); }
  };
  const archiveRule = async (id: string) => {
    try { await api.rejectRule(id); await loadRules(); } catch (e) { flash(e instanceof Error ? e.message : "削除に失敗"); }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 4 }}>設定</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        複数拠点・複数担当者での運用を前提にした設定です。組織全体で対応品質を統一し、現場の暗黙知を可視化・資産化します（社内暗黙知OS）。
      </p>
      {msg && <p style={{ color: "var(--ok)", fontWeight: 700 }}>{msg}</p>}

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
            <div className="kv"><span className="k">社内ルール</span><span>{rules.length} 件（承認済み）</span></div>
            <p className="hint" style={{ marginTop: 6 }}>業種・禁忌の変更は「初期設定」をやり直してください。会社名・担当者・社内ルールはこの画面で編集できます。</p>
            <a href="/setup" className="btn ghost sm" style={{ marginTop: 8, display: "inline-block" }}>初期設定をやり直す</a>
          </>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <p className="section-title">拠点（複数拠点対応）</p>
          {locations.length === 0 && <p className="hint">初期設定で会社名を登録すると表示されます。</p>}
          {locations.map((l) => (
            <div className="list-row" key={l.id}>
              <input className="text-input" value={l.name} onChange={(e) => editRow(setLocations, l.id, e.target.value)} style={{ flex: 1 }} />
              <span className="hint" style={{ whiteSpace: "nowrap" }}>{l.sub}</span>
              <button className="del" onClick={() => setLocations((p) => p.filter((x) => x.id !== l.id))}>✕</button>
            </div>
          ))}
          <div className="input-row" style={{ marginTop: 10 }}>
            <input className="text-input" placeholder="拠点名を追加…" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLoc()} />
            <button className="btn sm" onClick={addLoc}>追加</button>
          </div>
          <div className="input-actions" style={{ marginTop: 8 }}>
            <button className="btn sm ghost" onClick={saveCompany} disabled={!locations.some((l) => l.id === "loc_main")}>会社名を保存</button>
            <span className="hint">主拠点名＝会社名として保存。追加拠点の永続化は今後対応。</span>
          </div>
        </div>

        <div className="card">
          <p className="section-title">担当者（複数担当・承認者）</p>
          {operators.length === 0 && <p className="hint">初期設定で担当者を登録すると表示されます。</p>}
          {operators.map((o) => (
            <div className="list-row" key={o.id}>
              <input className="text-input" value={o.name} onChange={(e) => editRow(setOperators, o.id, e.target.value)} style={{ flex: 1 }} />
              <span className="hint" style={{ whiteSpace: "nowrap" }}>{o.sub}</span>
              <button className="del" onClick={() => setOperators((p) => p.filter((x) => x.id !== o.id))}>✕</button>
            </div>
          ))}
          <div className="input-row" style={{ marginTop: 10 }}>
            <input className="text-input" placeholder="担当者名を追加…" value={newOp} onChange={(e) => setNewOp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOp()} />
            <button className="btn sm" onClick={addOp}>追加</button>
          </div>
          <div className="input-actions" style={{ marginTop: 8 }}>
            <button className="btn sm ghost" onClick={saveOperator} disabled={!operators.some((o) => o.id === "op_main")}>担当者を保存</button>
            <span className="hint">主担当を保存。複数担当・権限管理(RBAC)は今後対応。</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, borderColor: "var(--accent-2)" }}>
        <p className="section-title">社内ルール（暗黙知DB）— 手動で追加・編集</p>
        <p className="hint" style={{ marginTop: -4 }}>
          ここで追加したルールは「承認済み」として登録され、現場の助言に反映されます。クレーム対応からの自動抽出は「管理」画面で承認します。
        </p>
        <div className="input-row" style={{ marginTop: 8, flexWrap: "wrap" }}>
          <select className="text-input" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ maxWidth: 160, flex: "0 0 auto" }}>
            {RULE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="text-input" placeholder="例：送迎遅延はまず安否確認→当日中に家族へ一次連絡" value={newStmt} onChange={(e) => setNewStmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRule()} />
          <button className="btn sm" onClick={addRule} disabled={!newStmt.trim()}>追加</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {rules.length === 0 && <p className="hint">まだ社内ルールがありません。上で追加するか、対応をクローズして学びを蓄積してください。</p>}
          {rules.map((r) => (
            <div className="list-row" key={r.id} style={{ alignItems: "flex-start" }}>
              <span className="grow">
                <span className="tag" style={{ background: "rgba(52,211,153,0.16)", color: "#86efac" }}>{r.category}</span>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{r.statement}</div>
              </span>
              <span className="hint" style={{ whiteSpace: "nowrap" }}>活用 {r.use_count}回</span>
              <button className="del" title="削除（アーカイブ）" onClick={() => archiveRule(r.id)}>✕</button>
            </div>
          ))}
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

      <div className="card" style={{ marginTop: 18, borderColor: "var(--accent-2)" }}>
        <p className="section-title">🧠 社内暗黙知OS ロードマップ（拡張・設計済み）</p>
        <p className="hint" style={{ marginTop: 0 }}>
          クレーム対応を入口に、業務の暗黙知を可視化・資産化していく拡張群。承認ゲート・監査・org分離の上で安全に育てます。
        </p>
        {TACIT_ROADMAP.map((x) => (
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
