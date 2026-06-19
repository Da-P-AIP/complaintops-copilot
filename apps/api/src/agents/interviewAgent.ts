import { BUSINESS_FORMS, APPROVER_OPTIONS, NOTIFY_OPTIONS } from "@complaintops/shared";
import { geminiChoices } from "./geminiClient";

/**
 * 対話型インタビューの選択肢（決定木フォールバック）。
 * 既知の枝は0コストの決定木で返す（コーパス/トークン節約）。
 */
export function getInterviewOptions(questionId: string, answers: Record<string, string>): string[] {
  switch (questionId) {
    case "form":
      return BUSINESS_FORMS[answers.industry_id ?? ""] ?? ["BtoB", "BtoC", "その他"];
    case "approver":
      return APPROVER_OPTIONS;
    case "notify":
      return NOTIFY_OPTIONS;
    default:
      return [];
  }
}

const QUESTION_LABEL: Record<string, string> = {
  form: "御社の形態・業態はどれですか？",
  approver: "返金や補償の承認は誰が行いますか？",
  notify: "SNS拡散などの高リスク時、誰に通知しますか？",
};

/**
 * AI動的選択肢生成（拡張枠）。AI_MODE=gemini かつキーがあれば文脈に応じてGeminiが生成、
 * 失敗・無効時は決定木にフォールバックする（verify-before-trust）。
 */
export async function generateInterviewOptions(
  questionId: string,
  answers: Record<string, string>,
): Promise<{ choices: string[]; source: "gemini" | "deterministic" }> {
  const fallback = getInterviewOptions(questionId, answers);
  if (process.env.AI_MODE !== "gemini" || !process.env.GEMINI_API_KEY) {
    return { choices: fallback, source: "deterministic" };
  }
  try {
    const question = QUESTION_LABEL[questionId] ?? questionId;
    const context = JSON.stringify(answers);
    const choices = await geminiChoices(question, context);
    return choices.length > 0
      ? { choices, source: "gemini" }
      : { choices: fallback, source: "deterministic" };
  } catch {
    return { choices: fallback, source: "deterministic" };
  }
}
