import type { ComplaintCase, ClosureResult } from "@complaintops/shared";

/**
 * Closure Gate Agent（02 MVP仕様 8.11 / 01 設計思想 7.3）
 * 案件を閉じてよいか判定する。未報告・未承認・未確認・残務があればクローズ不可。
 * 「対応したつもり」で閉じる事故を防ぐ。
 */
export function closureGate(c: ComplaintCase): ClosureResult {
  const reasons: string[] = [];
  const r = c.latest_risk;
  const res = c.resolutions ?? {};

  if (!c.report) reasons.push("報告書が未保存です");
  if (r) {
    if (r.supervisor_report_required && !res.supervisor_reported) reasons.push("上司報告が未完了です");
    if (r.approval_required && !res.approved) reasons.push("承認待ちが残っています");
    if (r.detected_risks.includes("evidence_missing") && !res.evidence_checked) {
      reasons.push("未確認事項（証拠）が残っています");
    }
  }
  if (!res.customer_replied) reasons.push("顧客への返信が未完了です");

  return {
    closure_status: reasons.length > 0 ? "blocked" : "closeable",
    blocking_reasons: reasons,
    required_actions: reasons,
  };
}
