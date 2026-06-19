# ComplaintOps Copilot

> クレーム対応中の人間をリアルタイムに守り、報告・承認・残務まで安全に閉じるAIエージェント
> （DevOps × AI Agent Hackathon 2026 出展作品 / 3作目）

AIが顧客を説得するのではなく、**クレーム対応中の担当者を横で守る**ことを中心思想に置いた業務AIオペレーション基盤です。会話を聞き、リスクを読み、禁忌表現を止め、次の一手を提示します。

## 現在のステータス（Milestone 1 / 最小ループ）

`15プロンプト.txt` の最小MVPを実装し、**ローカルで一周動作・検証済み**です。

- ✅ `POST /api/cases` 案件作成 → `POST /api/cases/:id/sessions` セッション開始 → `POST /api/sessions/:id/events` 発話投入
- ✅ モックAIが危険度・検出リスク・上司報告要否・承認要否を判定
- ✅ 「今言うべきこと」「言ってはいけないこと（＋理由）」「次アクション」を生成
- ✅ 監査ログ（prev_hash → event_hash の軽量ハッシュチェーン）
- ✅ 現場対応画面 `/cases/[caseId]/live` でリアルタイム表示
- ✅ API / Web ともに `tsc` 型チェック通過、Next 本番ビルド成功

> AIはモック（キーワードルール）です。`apps/api/src/agents/riskJudgeAgent.ts` を Gemini 呼び出しに差し替えても、戻り値の型（`RiskResult`）は不変な設計です。

## 技術スタック

- Web: Next.js 14（App Router） / React 18 / TypeScript
- API: Express / TypeScript（`tsx` 実行）
- 共有: pnpm workspace の `@complaintops/shared`（型・定数）
- 想定デプロイ: Cloud Run（`apps/api/Dockerfile`）
- AI（予定）: Gemini API / Cloud Run / Firestore へ差し替え

## セットアップ

前提: Node.js 20+ / pnpm 9+

```bash
pnpm install
```

### API を起動（ポート 8080）

```bash
pnpm dev:api
# → [complaintops-api] listening on :8080
```

### Web を起動（ポート 3000）

```bash
pnpm dev:web
# → http://localhost:3000
```

ブラウザで http://localhost:3000 を開き、「クレーム対応を開始する」を押すと現場対応画面に遷移します。

## 動作確認（API 単体・curl）

```bash
# 案件作成
CID=$(curl -s -X POST localhost:8080/api/cases -d '{}' -H 'Content-Type: application/json' | jq -r .data.id)
# セッション開始
SID=$(curl -s -X POST localhost:8080/api/cases/$CID/sessions -d '{}' -H 'Content-Type: application/json' | jq -r .data.id)
# 顧客発話 → AI判定
curl -s -X POST localhost:8080/api/sessions/$SID/events \
  -H 'Content-Type: application/json' \
  -d '{"text":"壊れた商品が届きました。こんな対応ならSNSに書きます。ちゃんと返金してください。"}' | jq
# 監査チェーン
curl -s localhost:8080/api/audit | jq
```

期待される判定（抜粋）: `risk_level: high` / `detected_risks: [sns_risk, refund_possible, product_damage, evidence_missing, high_anger]` / `supervisor_report_required: true` / `approval_required: true`。

## デプロイ（Cloud Run）

リポジトリ root の `Dockerfile` を使って API を Cloud Run へデプロイします（ビルドコンテキスト = root）。

```bash
gcloud run deploy complaintops-api \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080
```

デプロイ後、払い出された URL の `/health` が `{"ok":true,...}` を返せば稼働確認OK。Web 側は `NEXT_PUBLIC_API_BASE` にその URL を設定します。

## 安全ルール（07 Safety Policy 準拠）

- AIは顧客への正式送信を自動実行しない
- AIは返金を確約しない／法的責任を断定しない
- 「必ず返金します」「当社の責任です」「SNSに書かないでください」は禁忌表現として理由付きで表示
- 返金要求・SNSリスク時は `approval_required` / `supervisor_report_required` を立てる
- 重要操作は `audit_events` に記録

## ディレクトリ構成

詳細は [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) を参照。設計資料は `各資料/`（PDF）にあります。

## ロードマップ

実装計画（Must / Should / Won't・タイムボックス・デモ台本）は `各資料/00_実装計画書_v1.md` を参照。

- 次の一手: モックAI → Gemini 差し替え、報告書生成 + クローズ判定、Cloud Run デプロイ、改善提案パネル、CI/CD。
