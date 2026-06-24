import type { AnalyzeResult, IndustryProfile } from "@complaintops/shared";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function url(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
}

async function callOnce(prompt: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Gemini empty response");
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

// タイムアウト延長＋1回リトライ（フォールバック落ちを減らす）。
async function callGemini(prompt: string, timeoutMs = 16000): Promise<string> {
  try {
    return await callOnce(prompt, timeoutMs);
  } catch {
    return await callOnce(prompt, timeoutMs);
  }
}

// Geminiが稀にコードフェンス等を付けても拾えるよう頑健にJSONを抽出する。
function safeJson<T>(raw: string): T {
  const s = (raw ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    const m = s.match(/[{[][\s\S]*[}\]]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Gemini JSON parse failed");
  }
}

const SYSTEM = `あなたはクレーム対応支援AI「ComplaintOps Copilot」のエンジンです。返金確約・法的責任断定・正式送信は行いません（提案・下書きまで）。`;

// 業種プロファイルから背景・呼称のヒント文を作る（正本テーブルを参照）。
function profileHint(p?: IndustryProfile): string {
  if (!p) return "";
  return `# 業種の背景\n${p.setting}\n相手の呼称は「${p.customer_term}」を用い、その業界で自然な言葉づかい・用語にすること。`;
}

// 過去の対応から蓄積した「社内の暗黙知（承認済みルール）」をプロンプトに注入する。
// 意味検索で選ばれた“今の案件に関連する”ルールだけが渡ってくる前提。
function knowledgeHint(rules?: string[]): string {
  const list = (rules ?? []).map((s) => (s || "").trim()).filter(Boolean);
  if (list.length === 0) return "";
  return `# 社内の暗黙知（過去の対応から承認された学び・最優先で踏まえる）
${list.map((s) => `- ${s}`).join("\n")}
これらは自社で実際に有効だった判断指針です。say_this / next_actions に自然に反映してください（丸写しはしない）。ただし金銭・補償の確約ガードは暗黙知より優先します。`;
}

/**
 * 会話の文脈を踏まえてクレームを判定し、担当者が「次に」言うべき発話案を出す。
 * @param learnedRules 意味検索で選ばれた、今の案件に関連する承認済み社内ルールの本文。
 */
export async function geminiAnalyze(text: string, history?: string, profile?: IndustryProfile, learnedRules?: string[]): Promise<Partial<AnalyzeResult>> {
  const prompt = `${SYSTEM}
${profileHint(profile)}
${knowledgeHint(learnedRules)}
# これまでの会話
${history && history.trim() ? history : "（まだありません）"}
# 直近の顧客発話
${text}
# 指示
会話全体の流れを踏まえて判定し、担当者が「次に」言うべき発話案(say_this)を出してください。呼称・用語は上記の業種背景に必ず合わせること。すでに謝罪や事実確認が済んでいれば繰り返さず、次の段階（方針提示・代替案・クロージング等）へ進めること。
重要: say_this では「返金します／全額返金／無料にします／代金を頂戴しません／必ず補償します」等の金銭・補償の確約を絶対にしないこと。必ず「確認のうえ」「上席の承認を得てから」など留保つきの表現に留めること。
# 出力（JSONのみ。前後に文章を付けない）
{"risk_level":"low|medium|high|critical","anger_level":"low|medium|high","complaint_type":"product_damage|delivery|refund|service|billing|other","detected_risks":[],"supervisor_report_required":false,"approval_required":false,"say_this":[],"dont_say_this":[{"phrase":"","category":"refund_commitment|legal_responsibility|customer_action_restriction|dismissive|other","severity":"low|medium|high","reason":""}],"next_actions":[]}`;
  return safeJson(await callGemini(prompt)) as Partial<AnalyzeResult>;
}

/**
 * Geminiがクレーム客を演じ、担当者の対応に反応して次の一言を返す。
 */
export async function geminiCustomerTurn(history: string, profile?: IndustryProfile): Promise<string> {
  const prompt = `あなたはクレーム対応の研修で「クレーム客」を演じます。業種は「${profile?.label || "一般"}」。
${profileHint(profile)}
あなた自身の立場は「${profile?.customer_term || "顧客"}」です。その立場として自然な言葉づかいで話してください。
# これまでの会話
${history && history.trim() ? history : "（まだありません）"}
# 指示
担当者の直近の対応を踏まえ、クレーム客として次の一言を返してください。
- 担当者の対応が丁寧で的確なら、少し落ち着いた反応に。
- 不適切（責任回避・断定・突き放し・禁忌表現）なら、不満や怒りを強める。
- 解決に近づいたら矛を収め始める。1〜2文の短い発話。顧客のセリフのみ。
# 出力（JSONのみ）
{"line":"（クレーム客のセリフ）"}`;
  const parsed = safeJson(await callGemini(prompt, 10000)) as { line?: string };
  const line = (parsed.line ?? "").toString().trim();
  if (!line) throw new Error("empty customer line");
  return line;
}

/**
 * 初期設定ウィザードの選択肢を文脈に応じて生成する（拡張枠）。失敗時は決定木にフォールバック。
 */
export async function geminiChoices(question: string, context: string): Promise<string[]> {
  const prompt = `クレーム対応システムの初期設定です。次の質問に対する適切な選択肢を3〜5個、JSON配列(文字列のみ)で返してください。最後に必ず「その他」を含めること。質問: ${question}\nこれまでの回答(文脈): ${context}`;
  const arr = safeJson(await callGemini(prompt, 10000));
  return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
}

export interface GeminiRulesResult {
  tone?: string;
  approval_required?: string[];
  forbidden_phrases?: { phrase: string; category: string; severity: string; reason: string }[];
}

/** 既知業種の会社ルール（禁忌・承認・トーン）を会社情報で精緻化する。 */
export async function geminiSetupRules(input: { industry_label?: string; company_name?: string; text?: string }): Promise<GeminiRulesResult> {
  const prompt = `あなたはクレーム対応の業務設計AIです。次の会社情報から、その業種・会社に即した「禁忌表現（担当者が言ってはいけない言葉）」「人間承認が必要な操作」「対応トーン」を作ってください。
# 会社情報
業種: ${input.industry_label || "一般"}
会社名: ${input.company_name || ""}
説明: ${input.text || ""}
# 指示
- 禁忌表現は、その業種で実際に事故・炎上・苦情悪化につながりやすい具体的な言い回しを4〜6個。理由もその業種に即して。
- category は refund_commitment / legal_responsibility / customer_action_restriction / dismissive / other のいずれか。
- approval_required は、その会社で人間承認すべき操作（返金・補償・正式送信・法的判断など）。
# 出力（JSONのみ。前後に文章を付けない）
{"tone":"","approval_required":[],"forbidden_phrases":[{"phrase":"","category":"","severity":"low|medium|high","reason":""}]}`;
  return safeJson(await callGemini(prompt)) as GeminiRulesResult;
}

export interface GeminiRuleExtract {
  statement?: string;
  category?: string;
  rationale?: string;
}

/** 対応の会話・報告書から「次に活かせる社内ルール（学び）」を1件抽出する。 */
export async function geminiExtractRule(history: string, report: string, profile?: IndustryProfile): Promise<GeminiRuleExtract> {
  const prompt = `あなたはクレーム対応のナレッジ抽出AIです。今回の対応から、次回以降に活かせる「社内ルール（学び）」を1件だけ抽出してください。
${profileHint(profile)}
# 今回の会話
${history && history.trim() ? history : "（記録なし）"}
# 報告書
${report && report.trim() ? report : "（なし）"}
# 指示
- この業種・現場で再利用できる、具体的で実行可能な判断ルールを1文で（statement）。
- category は 事実確認 / エスカレーション / 顧客対応 / 補償判断 / 再発防止 / その他 から1つ。
- rationale は、なぜそれが有効かを一言で。
- 一般論ではなく、この対応から学べる「現場の型」を。
# 出力（JSONのみ。前後に文章を付けない）
{"statement":"","category":"","rationale":""}`;
  return safeJson(await callGemini(prompt, 10000)) as GeminiRuleExtract;
}

export interface GeminiProfileResult extends GeminiRulesResult {
  customer_term?: string;
  setting?: string;
  fact_finding?: string;
  next_confirm?: string[];
  customer_reactions?: { acknowledge?: string; factfind?: string; propose?: string; close?: string; resolved?: string };
}

/** 未知業種の業種プロファイル一式（呼称・特性・事実確認・客反応・禁忌・承認・トーン）を生成する。 */
export async function geminiIndustryProfile(industryLabel: string, text?: string): Promise<GeminiProfileResult> {
  const prompt = `あなたはクレーム対応の業務設計AIです。「${industryLabel}」という業種について、クレーム対応の業種プロファイルを作成してください。
${text ? `補足説明: ${text}` : ""}
# 作るもの
- customer_term: その業種で顧客を指す自然な呼称（例: 介護なら「ご利用者様／ご家族様」、BtoBなら「ご担当者様」）。
- setting: その業種のクレームでよく出る文脈の説明（1〜2文）。
- fact_finding: 事実確認のための丁寧な定型文（1文）。
- next_confirm: その業種で確認すべき項目を3つ。
- customer_reactions: クレーム客が各段階で言いそうな一言。acknowledge(謝罪前)/factfind(事実確認段階)/propose(方針待ち)/close(締め)/resolved(解決し矛を収める)。呼称や文脈をその業種に合わせる。
- forbidden_phrases: その業種で言ってはいけない具体的な禁句を4〜6個（phrase, category, severity, reason）。category は refund_commitment/legal_responsibility/customer_action_restriction/dismissive/other。
- approval_required: 人間承認が必要な操作。
- tone: 推奨トーン。
# 出力（JSONのみ。前後に文章を付けない）
{"customer_term":"","setting":"","fact_finding":"","next_confirm":[],"customer_reactions":{"acknowledge":"","factfind":"","propose":"","close":"","resolved":""},"forbidden_phrases":[{"phrase":"","category":"","severity":"low|medium|high","reason":""}],"approval_required":[],"tone":""}`;
  return safeJson(await callGemini(prompt)) as GeminiProfileResult;
}
