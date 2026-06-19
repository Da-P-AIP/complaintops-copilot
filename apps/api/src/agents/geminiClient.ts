import type { AnalyzeResult } from "@complaintops/shared";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `あなたはクレーム対応支援AI「ComplaintOps Copilot」のリスク判定エンジンです。
顧客の発話を分析し、現場担当者を守るための判定をJSONで返します。
あなたは返金の確約・法的責任の断定・顧客への正式送信を絶対に行いません（提案・下書き・候補まで）。`;

function buildPrompt(text: string): string {
  return `${SYSTEM}

# 顧客発話
${text}

# 出力（JSONのみ。前後に説明文を付けない）
{
  "risk_level": "low|medium|high|critical",
  "anger_level": "low|medium|high",
  "complaint_type": "product_damage|delivery|refund|service|billing|other",
  "detected_risks": ["sns_risk または refund_possible / evidence_missing / legal_risk / privacy_risk / violence_or_threat_risk / product_damage / high_anger を該当分だけ"],
  "supervisor_report_required": true,
  "approval_required": true,
  "say_this": ["担当者が今言うべき丁寧な発話。責任断定・返金確約は禁止", "..."],
  "dont_say_this": [{"phrase":"言ってはいけない表現","category":"refund_commitment|legal_responsibility|customer_action_restriction|dismissive|other","severity":"low|medium|high","reason":"理由"}],
  "next_actions": ["次にとるべきアクション", "..."]
}`;
}

/**
 * Gemini でクレーム発話を分析する。
 * 失敗時は呼び出し側（Orchestrator）がモックの安全フロアにフォールバックする。
 */
export async function geminiAnalyze(text: string): Promise<Partial<AnalyzeResult>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Gemini empty response");
    return JSON.parse(raw) as Partial<AnalyzeResult>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 初期設定ウィザードの選択肢を文脈に応じて生成する（AI動的選択肢生成の拡張枠）。
 * 失敗時は呼び出し側が決定木のフォールバックを使う。
 */
export async function geminiChoices(question: string, context: string): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const prompt = `クレーム対応システムの初期設定です。次の質問に対する適切な選択肢を3〜5個、JSON配列(文字列のみ)で返してください。最後に必ず「その他」を含めること。質問: ${question}\nこれまでの回答(文脈): ${context}\n出力例: ["A","B","C","その他"]`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Gemini empty response");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
  } finally {
    clearTimeout(timer);
  }
}
