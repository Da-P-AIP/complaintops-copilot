import type { AnalyzeResult } from "@complaintops/shared";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function url(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
}

async function callGemini(prompt: string, timeoutMs = 12000): Promise<string> {
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

const SYSTEM = `あなたはクレーム対応支援AI「ComplaintOps Copilot」のエンジンです。返金確約・法的責任断定・正式送信は行いません（提案・下書きまで）。`;

/**
 * 会話の文脈を踏まえてクレームを判定し、担当者が「次に」言うべき発話案を出す。
 * 既に謝罪済みなら謝罪を繰り返さず、会話の流れに沿って次の一手を返す。
 */
export async function geminiAnalyze(text: string, history?: string): Promise<Partial<AnalyzeResult>> {
  const prompt = `${SYSTEM}
# これまでの会話
${history && history.trim() ? history : "（まだありません）"}
# 直近の顧客発話
${text}
# 指示
会話全体の流れを踏まえて判定し、担当者が「次に」言うべき発話案(say_this)を出してください。すでに謝罪や事実確認が済んでいれば繰り返さず、次の段階（方針提示・代替案・クロージング等）へ進めること。
# 出力（JSONのみ。前後に文章を付けない）
{"risk_level":"low|medium|high|critical","anger_level":"low|medium|high","complaint_type":"product_damage|delivery|refund|service|billing|other","detected_risks":[],"supervisor_report_required":false,"approval_required":false,"say_this":[],"dont_say_this":[{"phrase":"","category":"refund_commitment|legal_responsibility|customer_action_restriction|dismissive|other","severity":"low|medium|high","reason":""}],"next_actions":[]}`;
  return JSON.parse(await callGemini(prompt)) as Partial<AnalyzeResult>;
}

/**
 * Geminiがクレーム客を演じ、担当者の対応に反応して次の一言を返す。
 * 丁寧で適切な対応なら落ち着き、責任回避・断定・突き放しなら不満を強める。
 */
export async function geminiCustomerTurn(history: string, industryLabel: string): Promise<string> {
  const prompt = `あなたはクレーム対応の研修で「クレーム客」を演じます。業種は「${industryLabel || "一般"}」。
# これまでの会話
${history && history.trim() ? history : "（まだありません）"}
# 指示
担当者の直近の対応を踏まえ、クレーム客として次の一言を返してください。
- 担当者の対応が丁寧で的確なら、少し落ち着いた反応に。
- 不適切（責任回避・断定・突き放し・禁忌表現）なら、不満や怒りを強める。
- 解決に近づいたら矛を収め始める。1〜2文の短い発話。顧客のセリフのみ。
# 出力（JSONのみ）
{"line":"（クレーム客のセリフ）"}`;
  const parsed = JSON.parse(await callGemini(prompt, 10000)) as { line?: string };
  const line = (parsed.line ?? "").toString().trim();
  if (!line) throw new Error("empty customer line");
  return line;
}

/**
 * 初期設定ウィザードの選択肢を文脈に応じて生成する（拡張枠）。失敗時は決定木にフォールバック。
 */
export async function geminiChoices(question: string, context: string): Promise<string[]> {
  const prompt = `クレーム対応システムの初期設定です。次の質問に対する適切な選択肢を3〜5個、JSON配列(文字列のみ)で返してください。最後に必ず「その他」を含めること。質問: ${question}\nこれまでの回答(文脈): ${context}`;
  const arr = JSON.parse(await callGemini(prompt, 10000));
  return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
}

export interface GeminiRulesResult {
  tone?: string;
  approval_required?: string[];
  forbidden_phrases?: { phrase: string; category: string; severity: string; reason: string }[];
}

/** 業種・会社に即した禁忌表現・承認条件・トーンを生成する。 */
export async function geminiSetupRules(input: {
  industry_label?: string;
  company_name?: string;
  text?: string;
}): Promise<GeminiRulesResult> {
  const prompt = `あなたはクレーム対応の業務設計AIです。次の会社情報から、その業種・会社に即した「禁忌表現（担当者が言ってはいけない言葉）」「人間承認が必要な操作」「対応トーン」を作ってください。
# 会社情報
業種: ${input.industry_label || "一般"}
会社名: ${input.company_name || ""}
説明: ${input.text || ""}
# 指示
- 禁忌表現は、その業種で実際に事故・炎上・苦情悪化につながりやすい具体的な言い回しを4〜6個。理由もその業種に即して。
  例）介護・福祉なら「ご家族には黙っていてください」「うちの職員は悪くありません」「決まりですので無理です」等、その現場特有の地雷を。
- category は refund_commitment / legal_responsibility / customer_action_restriction / dismissive / other のいずれか。
- approval_required は、その会社で人間承認すべき操作（返金・補償・正式送信・法的判断など）。
# 出力（JSONのみ。前後に文章を付けない）
{"tone":"","approval_required":[],"forbidden_phrases":[{"phrase":"","category":"","severity":"low|medium|high","reason":""}]}`;
  return JSON.parse(await callGemini(prompt)) as GeminiRulesResult;
}
