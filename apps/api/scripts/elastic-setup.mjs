// Elastic セットアップ＆シード（暗黙知の意味検索インデックス）
//
// 使い方:
//   1) .env に ELASTIC_MODE=on / ELASTIC_NODE(or ELASTIC_CLOUD_ID) / ELASTIC_API_KEY を設定
//      （意味検索を使うなら ELASTIC_INFERENCE_ID も。例: .elser-2-elasticsearch）
//   2) インデックス作成のみ:        node scripts/elastic-setup.mjs
//      jsonl を一括投入も同時に行う: node scripts/elastic-setup.mjs <path-to.jsonl> [orgId]
//
// 取り込める jsonl の形式（どちらでも可）:
//   A) ルール形式:  {"id","statement","category","industry_id","rationale","status","created_at"}
//   B) FAQ形式(尼崎):{"content","facet_key","facet_label","@timestamp"}  → statement に content を使う
//
// 失敗しても本体アプリは動く（このスクリプトはあくまで初期化用）。

import fs from "node:fs";
import readline from "node:readline";

const INDEX = process.env.ELASTIC_RULES_INDEX || "complaintops-rules";
const INFERENCE_ID = process.env.ELASTIC_INFERENCE_ID || "";
const USE_SEMANTIC = Boolean(INFERENCE_ID);

function assertEnv() {
  if (process.env.ELASTIC_MODE !== "on") throw new Error("ELASTIC_MODE=on が必要です");
  if (!process.env.ELASTIC_API_KEY) throw new Error("ELASTIC_API_KEY が必要です");
  if (!process.env.ELASTIC_NODE && !process.env.ELASTIC_CLOUD_ID) throw new Error("ELASTIC_NODE か ELASTIC_CLOUD_ID が必要です");
}

async function makeClient() {
  const { Client } = await import("@elastic/elasticsearch");
  const auth = { apiKey: process.env.ELASTIC_API_KEY };
  return process.env.ELASTIC_CLOUD_ID
    ? new Client({ cloud: { id: process.env.ELASTIC_CLOUD_ID }, auth })
    : new Client({ node: process.env.ELASTIC_NODE, auth });
}

async function ensureIndex(client) {
  const exists = await client.indices.exists({ index: INDEX });
  if (exists) {
    console.log(`[setup] index "${INDEX}" は既に存在します`);
    return;
  }
  const properties = {
    org_id: { type: "keyword" },
    rule_id: { type: "keyword" },
    industry_id: { type: "keyword" },
    status: { type: "keyword" },
    category: { type: "keyword" },
    statement: { type: "text" },
    rationale: { type: "text" },
    use_count: { type: "integer" },
    created_at: { type: "date" },
  };
  // 意味検索を使う場合のみ semantic_text フィールドを足す（Elastic側でEmbedding）。
  if (USE_SEMANTIC) {
    properties.statement_semantic = { type: "semantic_text", inference_id: INFERENCE_ID };
  }
  await client.indices.create({ index: INDEX, mappings: { properties } });
  console.log(`[setup] index "${INDEX}" を作成しました（semantic=${USE_SEMANTIC}）`);
}

function toDoc(obj, orgId) {
  // FAQ形式 → ルール形式へ正規化
  if (obj.content && !obj.statement) {
    return {
      org_id: orgId,
      rule_id: obj.id || `faq_${Math.random().toString(36).slice(2)}`,
      industry_id: obj.facet_key || null,
      status: "approved",
      category: obj.facet_label || "FAQ",
      statement: String(obj.content).replace(/\s+/g, " ").trim(),
      rationale: "尼崎市FAQ（デモ用シード）",
      use_count: 0,
      created_at: obj["@timestamp"] || new Date().toISOString(),
    };
  }
  return {
    org_id: orgId,
    rule_id: obj.id || `rule_${Math.random().toString(36).slice(2)}`,
    industry_id: obj.industry_id || null,
    status: obj.status || "approved",
    category: obj.category || "その他",
    statement: String(obj.statement || "").trim(),
    rationale: obj.rationale || "",
    use_count: obj.use_count || 0,
    created_at: obj.created_at || new Date().toISOString(),
  };
}

async function bulkLoad(client, file, orgId) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let ops = [];
  let n = 0;
  const flush = async () => {
    if (ops.length === 0) return;
    const res = await client.bulk({ operations: ops, refresh: false });
    if (res.errors) {
      const firstErr = res.items.find((i) => i.index && i.index.error)?.index?.error;
      console.warn("[setup] bulk に一部エラー:", firstErr?.reason || "(詳細不明)");
    }
    ops = [];
  };
  for await (const line of rl) {
    const s = line.trim();
    if (!s) continue;
    let obj;
    try { obj = JSON.parse(s); } catch { continue; }
    const doc = toDoc(obj, orgId);
    if (!doc.statement) continue;
    if (USE_SEMANTIC) doc.statement_semantic = doc.statement;
    ops.push({ index: { _index: INDEX, _id: doc.rule_id } });
    ops.push(doc);
    n++;
    if (ops.length >= 400) await flush(); // semantic_text 利用時は重いので控えめに
  }
  await flush();
  await client.indices.refresh({ index: INDEX });
  console.log(`[setup] ${n} 件を "${INDEX}" に投入しました`);
}

async function main() {
  assertEnv();
  const file = process.argv[2];
  const orgId = process.argv[3] || "org_001";
  const client = await makeClient();
  await ensureIndex(client);
  if (file) {
    if (!fs.existsSync(file)) throw new Error(`ファイルが見つかりません: ${file}`);
    await bulkLoad(client, file, orgId);
  } else {
    console.log("[setup] jsonl パス未指定。インデックス作成のみ実行しました。");
  }
}

main().catch((e) => {
  console.error("[setup] 失敗:", e?.message || e);
  process.exit(1);
});
