# Elastic 統合：暗黙知の「意味検索」リトリーバ

ComplaintOps Copilot の暗黙知サイクル（蓄積→承認→助言へ注入）の **「注入」前段の取得（retrieval）** を、
Elastic の意味検索に差し替える改良。DevOps × AI Agent Hackathon の Gold スポンサー技術（Elasticsearch）を
中核に据える。

## なぜ要るか（before / after）

これまで承認済み暗黙知の選択は **「業種で絞って先頭3件」** だった（関連度ゼロ）。

```
const applicable = approved.filter(業種一致).slice(0, 3);   // ← 先頭3件
```

暗黙知が増えるほど「使われない3件」が固定化し、キャッチコピーの **「使うほど賢くなる」が機能しない**。
本改良で **「直近の発話に意味が近い上位3件」** を引くようにした。暗黙知が増える＝関連ヒットの精度が上がる、
という形で “賢くなる” が物理的に成立する。

## 段階的フォールバック（安全フロア思想の踏襲）

`agents/knowledgeRetriever.ts#selectRelevantRules` が次の順で劣化する。どの段でも壊れない。

1. **Elastic 意味検索**（`ELASTIC_MODE=on`）— ELSER/Embedding（`ELASTIC_INFERENCE_ID` 指定時）または BM25。大量データでも関連順。
2. **ローカル関連度** — 日本語の文字バイグラム Dice 係数。外部依存なし・オフラインで動作し、先頭3件より賢い。
3. **完全フォールバック** — 従来どおり先頭 k 件。

監査台帳には採用方式（`knowledge_method: elastic|local|first|none`）と使用ルールID（`knowledge_used`）を記録するので、
「どの暗黙知を、どの方式で根拠にしたか」が後から監査できる。

## 変更点（差分マップ）

| ファイル | 変更 |
|---|---|
| `apps/api/src/lib/elasticClient.ts` | **新規**。env-gate＋動的importの薄いラッパー。`indexRule` / `searchRuleStatements`。失敗時 null。 |
| `apps/api/src/agents/knowledgeRetriever.ts` | **新規**。`selectRelevantRules`（Elastic→ローカル→先頭の3段）。 |
| `apps/api/src/routes/sessions.routes.ts` | 2箇所の `slice(0,3)` を `selectRelevantRules` に置換。監査に method/IDを記録。 |
| `apps/api/src/agents/geminiClient.ts` | `geminiAnalyze` に `learnedRules` 引数。暗黙知をプロンプトに注入（推論そのものに効かせる）。 |
| `apps/api/src/orchestrator/ComplaintOpsOrchestrator.ts` | `policy.learned_rules` の本文を `geminiAnalyze` へ受け渡し。確約ガードは維持。 |
| `apps/api/src/routes/rules.routes.ts` | 手動追加・承認時に `indexRule`（best-effort）。 |
| `apps/api/scripts/elastic-setup.mjs` | **新規**。index 作成＋jsonl一括投入（ルール形式／尼崎FAQ形式の両対応）。 |
| `.env.example` / `apps/api/package.json` | Elastic env と `@elastic/elasticsearch` 依存、`elastic:setup` スクリプト。 |

既存の8エージェント・Firestore・ハッシュチェーン監査・SECIサイクル・認証・UIは **未変更**。

## セットアップ（5分・Bootcamp手順に準拠）

1. Elastic Cloud Trial を作成 → API Key と endpoint(URL or Cloud ID) を取得。
2. `.env` に設定:
   ```
   ELASTIC_MODE=on
   ELASTIC_NODE=https://....es....elastic.cloud:443
   ELASTIC_API_KEY=...
   ELASTIC_INFERENCE_ID=.elser-2-elasticsearch   # 意味検索を使う場合
   ```
3. 依存導入とインデックス作成:
   ```
   pnpm --filter @complaintops/api install
   pnpm --filter @complaintops/api elastic:setup
   ```
4. （デモ用）尼崎FAQを意味検索のネタとして投入:
   ```
   pnpm --filter @complaintops/api elastic:setup /path/to/data_facet_taxonomy_timestamped.jsonl org_001
   ```
5. 以降、承認した暗黙知は自動で Elastic にインデックスされ、会話時に意味検索で引かれる。

`ELASTIC_MODE` を外せば即ローカル動作に戻る（デモ保険）。

## デモの見せ方（審査向け）

- 暗黙知を数十件入れた状態で、関連する事案を会話 → **先頭3件ではなく文脈に合った暗黙知**が助言へ反映されることを示す。
- 監査台帳で `knowledge_method=elastic` と `knowledge_used=[...]` を見せ、**根拠の追跡可能性**を強調。
- `ELASTIC_MODE` をオフ→オンで切り替え、**安全フロア（壊れない設計）** を実演。

## 次の拡張（やるなら）

- MCP サーバ化：外部（Gemini CLI 等）から暗黙知を意味検索で叩けるようにする。
- A2A：助言生成を Elastic AI Agent と連携。
- リランキング：BM25＋semanticのハイブリッド＋Cohere等の再ランクで精度の上積み。
