// 暗黙知リトリーバ：案件の発話に「意味が近い」承認済みルールを選ぶ。
//
// これが今回の改良の核。従来は `approved.filter(業種).slice(0, 3)` ＝ 先頭3件（関連度ゼロ）。
// それを次の優先順で置き換える:
//   1) Elastic（意味検索 / ELSER or BM25）— 大量の暗黙知でも関連度で上位k件
//   2) ローカル関連度（日本語の文字バイグラム重なり）— Elastic無し/失敗でも「関連順」に改善
//   3) それも0件なら従来どおり先頭k件（完全フォールバック）
//
// 1→2→3 と段階的に劣化するので、Elastic未設定でも壊れず、むしろ先頭3件より賢くなる。

import type { KnowledgeRule } from "@complaintops/shared";
import { searchRuleStatements } from "../lib/elasticClient";

export type RetrievalMethod = "elastic" | "local" | "first" | "none";

export interface RuleSelection {
  rules: KnowledgeRule[];
  method: RetrievalMethod;
}

// 業種一致 or 業種未指定（全社共通）のみを候補にする。
function applicable(rules: KnowledgeRule[], industryId?: string): KnowledgeRule[] {
  return rules.filter((r) => !r.industry_id || r.industry_id === industryId);
}

// 文字バイグラム集合（日本語はスペース分かち書きが無いので bigram で近似）。
function bigrams(s: string): Set<string> {
  const t = (s || "").replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

// Dice 係数による軽量類似度（0〜1）。外部依存なし・オフラインで動く。
function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return (2 * inter) / (a.size + b.size);
}

function rankLocal(query: string, candidates: KnowledgeRule[], k: number): KnowledgeRule[] {
  const qg = bigrams(query);
  return candidates
    .map((r) => ({ r, score: diceSimilarity(qg, bigrams(r.statement)) }))
    .sort((x, y) => y.score - x.score)
    .filter((x) => x.score > 0)
    .slice(0, k)
    .map((x) => x.r);
}

/**
 * 案件の発話 `query` に関連する承認済みルールを上位 k 件選ぶ。
 * @param orgId 組織ID（Elasticのフィルタに使用）
 * @param query 直近の顧客発話など、関連度の基準テキスト
 * @param candidates store から取得済みの承認済みルール（フォールバック用の母集団）
 */
export async function selectRelevantRules(
  orgId: string,
  query: string,
  candidates: KnowledgeRule[],
  opts: { industryId?: string; k?: number } = {},
): Promise<RuleSelection> {
  const k = opts.k ?? 3;
  const pool = applicable(candidates, opts.industryId);
  if (pool.length === 0) return { rules: [], method: "none" };

  // 1) Elastic 意味検索
  const hits = await searchRuleStatements(orgId, query, { industryId: opts.industryId, k, status: "approved" });
  if (hits && hits.length > 0) {
    const byId = new Map(pool.map((r) => [r.id, r]));
    const ordered = hits.map((h) => byId.get(h.id)).filter((r): r is KnowledgeRule => Boolean(r));
    if (ordered.length > 0) return { rules: ordered, method: "elastic" };
  }

  // 2) ローカル関連度ランキング
  const local = rankLocal(query, pool, k);
  if (local.length > 0) return { rules: local, method: "local" };

  // 3) 完全フォールバック：従来どおり先頭k件
  return { rules: pool.slice(0, k), method: "first" };
}
