import type { ConversationEvent, FlowState, IndustryProfile } from "@complaintops/shared";
import { GENERIC_PROFILE } from "../domain/industryProfiles";

// クレーム対応の型（4ステップ）。担当者の発話がどのステップを満たしたかをキーワードで判定。
const STAGE_DEFS = [
  { key: "acknowledge", label: "① 受容・共感（謝罪）", kw: ["申し訳", "恐れ入", "お詫び", "ご不便", "ご迷惑", "失礼いたし"] },
  { key: "factfind", label: "② 事実確認", kw: ["確認", "教えて", "お聞かせ", "いつ", "どこ", "お名前", "状況", "詳細", "？", "?"] },
  { key: "propose", label: "③ 方針・代替案の提示", kw: ["対応させて", "代替", "交換", "折り返し", "ご案内", "方針", "上席", "承認", "担当より", "改めてご連絡", "進めさせて"] },
  { key: "close", label: "④ 合意・クロージング", kw: ["記録し", "再発防止", "ありがとうござ", "引き続き", "よろしくお願い", "ご了承"] },
];

export function evaluateFlow(events: ConversationEvent[]): FlowState {
  const opText = events.filter((e) => e.speaker === "operator").map((e) => e.text).join("\n");
  const stages = STAGE_DEFS.map((d) => ({ key: d.key, label: d.label, done: d.kw.some((k) => opText.includes(k)) }));
  const next = stages.find((s) => !s.done)?.key ?? "close";
  const all_done = stages.every((s) => s.done);
  return { stages, next_stage: next, all_done, resolved: all_done };
}

// 全ステップ達成で「解決」。未達ならそのステップを促す客の反応（業種プロファイルの呼称・文脈で）。
export function fallbackCustomerReaction(events: ConversationEvent[], profile: IndustryProfile = GENERIC_PROFILE): { line: string; resolved: boolean } {
  const flow = evaluateFlow(events);
  const r = profile.customer_reactions;
  if (flow.all_done) return { line: r.resolved, resolved: true };
  const byStage: Record<string, string> = { acknowledge: r.acknowledge, factfind: r.factfind, propose: r.propose, close: r.close };
  return { line: byStage[flow.next_stage] ?? r.factfind, resolved: false };
}
