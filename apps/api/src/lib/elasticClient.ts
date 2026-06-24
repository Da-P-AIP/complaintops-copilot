// Elastic 接続ラッパー（暗黙知の意味検索バックエンド）
//
// 設計方針:
// - すべて env でゲートする。ELASTIC_MODE=on のときだけ有効。
// - @elastic/elasticsearch は「動的import」で読み込む。OFF のときは require されないので、
//   依存が未インストールでもサーバは起動する（安全フロア思想の踏襲）。
// - 失敗時は例外を投げず null/false を返す。呼び出し側はローカル・フォールバックへ落ちる。
//
// 必要な env（.env.example 参照）:
//   ELASTIC_MODE=on
//   ELASTIC_NODE=https://xxxx.es.<region>.gcp.elastic.cloud:443   (または ELASTIC_CLOUD_ID)
//   ELASTIC_API_KEY=...
//   ELASTIC_RULES_INDEX=complaintops-rules        (任意。既定値あり)
//   ELASTIC_INFERENCE_ID=.elser-2-elasticsearch   (任意。指定時は semantic_text で意味検索)

import type { KnowledgeRule } from "@complaintops/shared";

export interface RuleHit {
  id: string;
  statement: string;
  score: number;
}

export const RULES_INDEX = process.env.ELASTIC_RULES_INDEX || "complaintops-rules";
const INFERENCE_ID = process.env.ELASTIC_INFERENCE_ID || "";

export function elasticEnabled(): boolean {
  if (process.env.ELASTIC_MODE !== "on") return false;
  if (!process.env.ELASTIC_API_KEY) return false;
  return Boolean(process.env.ELASTIC_NODE || process.env.ELASTIC_CLOUD_ID);
}

// 動的importで得たクライアントをキャッシュ（型は any：依存が無くても typecheck を通すため）。
let clientPromise: Promise<any> | null = null;

async function getClient(): Promise<any> {
  if (!elasticEnabled()) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      // 動的import：ELASTIC_MODE!=on のときはこの行に到達しない。
      const mod: any = await import("@elastic/elasticsearch");
      const Client = mod.Client ?? mod.default?.Client;
      const auth = { apiKey: process.env.ELASTIC_API_KEY as string };
      if (process.env.ELASTIC_CLOUD_ID) {
        return new Client({ cloud: { id: process.env.ELASTIC_CLOUD_ID }, auth });
      }
      return new Client({ node: process.env.ELASTIC_NODE, auth });
    })().catch((e) => {
      console.warn("[elastic] client init failed; falling back:", (e as Error)?.message);
      clientPromise = null; // 次回再試行できるように
      return null;
    });
  }
  return clientPromise;
}

const useSemantic = (): boolean => Boolean(INFERENCE_ID);

// 承認済みルールを Index に投入（upsert）。書き込み経路の best-effort。失敗しても落とさない。
export async function indexRule(orgId: string, rule: KnowledgeRule): Promise<boolean> {
  try {
    const client = await getClient();
    if (!client) return false;
    const doc: Record<string, unknown> = {
      org_id: orgId,
      rule_id: rule.id,
      industry_id: rule.industry_id ?? null,
      status: rule.status,
      category: rule.category,
      statement: rule.statement,
      rationale: rule.rationale,
      use_count: rule.use_count ?? 0,
      created_at: rule.created_at,
    };
    // semantic_text フィールドは statement をコピーして使う（Elastic側でEmbedding）。
    if (useSemantic()) doc.statement_semantic = rule.statement;
    await client.index({ index: RULES_INDEX, id: rule.id, document: doc, refresh: "wait_for" });
    return true;
  } catch (e) {
    console.warn("[elastic] indexRule failed; ignored:", (e as Error)?.message);
    return false;
  }
}

// 案件の発話に意味が近い承認済みルールを上位k件返す。
// 失敗・無効時は null を返す（呼び出し側がローカル・フォールバックへ）。
export async function searchRuleStatements(
  orgId: string,
  query: string,
  opts: { industryId?: string; k?: number; status?: KnowledgeRule["status"] } = {},
): Promise<RuleHit[] | null> {
  try {
    const client = await getClient();
    if (!client) return null;
    const k = opts.k ?? 3;
    const status = opts.status ?? "approved";

    const filter: any[] = [
      { term: { org_id: orgId } },
      { term: { status } },
    ];
    // 業種一致 OR 業種未指定（全社共通ルール）のみ採用。
    if (opts.industryId) {
      filter.push({
        bool: {
          should: [
            { term: { industry_id: opts.industryId } },
            { bool: { must_not: { exists: { field: "industry_id" } } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const semanticOrText = useSemantic()
      ? { semantic: { field: "statement_semantic", query } } // ELSER/Embedding（Elastic側）
      : { match: { statement: { query } } }; // BM25 フォールバック

    const body: any = {
      size: k,
      query: { bool: { must: [semanticOrText], filter } },
      _source: ["rule_id", "statement"],
    };

    const res: any = await client.search({ index: RULES_INDEX, ...body });
    const hits: any[] = res?.hits?.hits ?? [];
    return hits.map((h) => ({
      id: (h._source?.rule_id as string) ?? h._id,
      statement: (h._source?.statement as string) ?? "",
      score: typeof h._score === "number" ? h._score : 0,
    }));
  } catch (e) {
    console.warn("[elastic] searchRuleStatements failed; falling back:", (e as Error)?.message);
    return null;
  }
}
