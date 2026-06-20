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
