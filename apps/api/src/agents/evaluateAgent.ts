import type { CompanyRules, Evaluation } from "@complaintops/shared";

/**
 * 担当者の実際の対応を評価する（モック版）。
 * 会社ルールの禁忌表現と、返金確約・責任断定の表現をチェックして、改善点を返す。
 */
export function evaluateAgent(text: string, policy: CompanyRules): Evaluation {
  const issues: string[] = [];
  for (const f of policy.forbidden_phrases) {
    if (text.includes(f.phrase)) {
      issues.push(`禁忌表現「${f.phrase}」が含まれています（${f.reason}）`);
    }
  }
  if (/全額返金|必ず返金|返金します/.test(text) && !issues.some((i) => i.includes("返金"))) {
    issues.push("返金を確約する表現の可能性があります。承認前は確約を避けましょう。");
  }
  if (/当社の責任|弊社の責任|こちらの責任/.test(text) && !issues.some((i) => i.includes("責任"))) {
    issues.push("責任を断定する表現の可能性があります。原因確認前は断定を避けましょう。");
  }

  const status: Evaluation["status"] = issues.length === 0 ? "ok" : "caution";
  const comment =
    issues.length === 0
      ? "禁忌表現は見つかりませんでした。事実確認と次アクションを示せていれば、良い対応です。"
      : "改善できる点があります。下記を見直すと、より安全な対応になります。";
  return { status, issues, comment };
}
