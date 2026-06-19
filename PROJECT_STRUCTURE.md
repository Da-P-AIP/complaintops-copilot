# PROJECT_STRUCTURE

ComplaintOps Copilot のプロジェクト構成（Milestone 1 / 最小ループ実装時点）。

```text
complaintops-copilot/
  README.md
  PROJECT_STRUCTURE.md
  .env.example
  .gitignore
  package.json              # pnpm workspace ルート（dev:api / dev:web スクリプト）
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    shared/                 # @complaintops/shared : 型・定数（API/Webで共有）
      package.json          # "type": "module", main = src/index.ts
      tsconfig.json
      src/
        index.ts
        types/index.ts      # RiskResult / Advice / AnalyzeResult / Case / AuditEvent ...
        constants/index.ts  # 禁忌表現・会社ルール・リスクキーワード・コレクション名

  apps/
    api/                    # @complaintops/api : Express + TypeScript（tsx実行）
      package.json
      tsconfig.json
      Dockerfile            # Cloud Run 用
      src/
        index.ts            # エントリ（/health, /api/audit, ルート登録）
        routes/
          cases.routes.ts   # POST /api/cases, GET, /:id/sessions ...
          sessions.routes.ts# POST /api/sessions/:id/events（発話→AI判定）
        orchestrator/
          ComplaintOpsOrchestrator.ts  # Observe→Risk→Rule→Advise を統制
        agents/
          riskJudgeAgent.ts # リスク判定（モック / Gemini差し替え対象）
          ruleAgent.ts      # 会社ルール照合・禁忌抽出
          advisorAgent.ts   # 発話案・次アクション生成
        db/
          mockDb.ts         # インメモリMap + 監査ハッシュチェーン
          collections.ts    # Firestoreコレクション名（将来差し替え用）
        utils/
          response.ts       # 共通レスポンス（ok / fail）

    web/                    # @complaintops/web : Next.js 14 App Router
      package.json
      next.config.js        # transpilePackages: ["@complaintops/shared"]
      tsconfig.json
      next-env.d.ts
      app/
        layout.tsx
        globals.css
        page.tsx            # ホーム（案件作成→live画面へ）
        cases/[caseId]/live/
          page.tsx          # 現場対応画面（会話入力→判定→助言）
      components/
        common/RiskBadge.tsx
        live/
          ConversationLog.tsx
          ConversationInput.tsx
          RiskPanel.tsx
          AdvicePanel.tsx
          ForbiddenPhraseList.tsx
      lib/
        apiClient.ts        # API 呼び出し（NEXT_PUBLIC_API_BASE）

  各資料/                    # 設計資料（PDF）+ 00_実装計画書_v1.md
```

## データフロー（最小ループ）

```text
Web (live page)
  └─ POST /api/sessions/:id/events  { text }
       └─ ComplaintOpsOrchestrator.analyzeUtterance(text)
            ├─ riskJudgeAgent   → RiskResult（危険度・検出リスク・報告/承認要否）
            ├─ ruleAgent        → 禁忌表現（理由付き）
            └─ advisorAgent     → say_this / dont_say_this / next_actions
       └─ mockDb 保存 + appendAudit（prev_hash → event_hash）
       └─ AnalyzeResult を返却 → RiskPanel / AdvicePanel が表示
```

## 設計資料との対応

- 01 設計思想書 → 中心思想・Agent構成・中核ループ
- 02 MVP仕様書 → 機能要件・出力JSON・画面
- 04 DB設計 → `COLLECTIONS` / 監査チェーン
- 05 API仕様 → エンドポイント・共通レスポンス
- 07 Safety Policy → 禁忌・承認ゲート・Overreach 方針
- 15 プロンプト.txt → 本最小ループの実装指示書
