import Link from "next/link";

const TENANT = [
  { t: "組織ごとのデータ分離（マルチテナント）", d: "ログインした組織ごとにデータを分離。Firebase認証で組織を識別し、自分の組織のデータにのみアクセスできます。" },
  { t: "サーバー側でのトークン検証", d: "APIはFirebaseのIDトークンをサーバーで検証して組織を確定。クライアント側の詐称はできません。" },
  { t: "Googleインフラに暗号化保存", d: "データはFirestoreに保管時暗号化で保存。セキュリティルールで他組織からのアクセスを遮断します。" },
];

const SAFE = [
  { t: "AIが暴走しない設計", d: "返金・補償・法的責任・正式送信などの危険操作は自動実行せず、人間承認へ回します（Approval Gate / Overreach Guard）。" },
  { t: "禁忌表現のストップ", d: "「必ず返金します」等の地雷表現を理由つきで提示し、事故を未然に防ぎます。" },
  { t: "改ざん検知できる監査ログ", d: "AIの判断と人間の操作を prev_hash → event_hash のハッシュチェーンで記録。説明責任を担保します。" },
  { t: "プライバシー最小化", d: "顧客情報は必要最小限のみ保存。外部送信は承認制です。" },
];

const QUALITY = [
  { t: "安全の絶対線を機械検証（8/8 合格）", d: "禁止語リーク・金銭/補償の確約・対応フロー到達・高リスク検知を、評価ハーネスで自動チェック。全業種ケースで合格。" },
  { t: "業種の呼称を100%維持", d: "介護＝ご利用者様／ご家族様、製造＝御社／弊社、飲食EC＝お客様。「お客様」の誤用ゼロを検証済み。" },
  { t: "一貫性（ブレ）を測定", d: "同一入力を複数回投げて計測。安全項目（呼称・禁止語・フロー・確約しない）は不変、文章表現だけが自然に変化することを確認。" },
];

const IMPROVED = [
  { t: "金銭・補償の確約 → ガードで解消", d: "AIが「無料にします」等を口にしかけても、systemが検知して断定を止め、上席承認へ。プロンプト＋確約ガードで再発防止。" },
  { t: "AI応答の安定化（フォールバック落ち 3/8 → 0/8）", d: "リトライ＋タイムアウト調整＋JSON解析の頑健化で、リッチな助言が安定して出るよう改善。" },
];

export default function SecurityPage() {
  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <h2 style={{ marginBottom: 4 }}>🔐 セキュリティとデータ保護</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        クレーム対応は個人情報や会社の責任が関わる業務です。ComplaintOps Copilot は「便利さ」より先に「安全に止まれること」を重視して設計しています。
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="section-title">会社ごとに分離されています</p>
        {TENANT.map((s) => (
          <div className="toggle" key={s.t}>
            <div className="label"><span className="t">✅ {s.t}</span><div className="d">{s.d}</div></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="section-title">AIの安全設計</p>
        {SAFE.map((s) => (
          <div className="toggle" key={s.t}>
            <div className="label"><span className="t">✅ {s.t}</span><div className="d">{s.d}</div></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, borderColor: "var(--accent-2)" }}>
        <p className="section-title">🧪 品質保証 — AIを機械評価し、自ら改善する</p>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          応答品質を"感覚"ではなく評価ハーネス（テストケース＋自動チェック）で機械的に検証。課題を見つけ → 修正 → 再評価する改善ループ（loop engineering）を実践しています。
        </p>
        {QUALITY.map((s) => (
          <div className="toggle" key={s.t}>
            <div className="label"><span className="t">✅ {s.t}</span><div className="d">{s.d}</div></div>
          </div>
        ))}
        <div style={{ fontWeight: 700, fontSize: 13, margin: "12px 0 4px" }}>改善ループの実績（評価 → 修正 → 再評価）</div>
        {IMPROVED.map((s) => (
          <div className="toggle" key={s.t}>
            <div className="label"><span className="t" style={{ color: "var(--ok)" }}>↑ {s.t}</span><div className="d">{s.d}</div></div>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 10 }}>※ 検証は同じハーネスで再現できます（CIのように繰り返し回せる）。安全項目は決定論ロジックで保証し、Geminiは安全側にマージしています。</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="section-title">正直な注記</p>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          現在のデータ分離は「ブラウザ単位の匿名認証」によるものです。別の端末・別のブラウザは別の組織として扱われます。
          実名アカウントでのログインや、複数端末・複数スタッフでの共有は、Googleログイン対応で拡張できます。
          実在の個人情報の本格運用は、セキュリティルール適用と運用確認の後を推奨します。
        </p>
      </div>

      <div className="cta-row" style={{ marginTop: 18 }}>
        <Link href="/setup" className="btn">初期設定から始める</Link>
        <Link href="/" className="btn ghost sm">← ホームに戻る</Link>
      </div>
    </div>
  );
}
