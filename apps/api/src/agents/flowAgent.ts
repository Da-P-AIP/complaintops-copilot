import type { ConversationEvent, FlowState } from "@complaintops/shared";

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

// 全ステップ達成で「解決」。未達ならそのステップを促すクレーム客の反応（決定論フォールバック）。
const REACTION: Record<string, string> = {
  acknowledge: "まず謝罪の一つもないんですか。誠意が感じられません。",
  factfind: "状況はさっき話した通りです。それで、どうしてくれるんですか？",
  propose: "確認はわかりましたが、結局どう対応してくれるのか教えてください。",
  close: "それで本当に大丈夫なんですか？ちゃんと記録して、再発防止してくださいね。",
};

export function fallbackCustomerReaction(events: ConversationEvent[]): { line: string; resolved: boolean } {
  const flow = evaluateFlow(events);
  if (flow.all_done) {
    return { line: "わかりました。丁寧にご対応いただき、ありがとうございます。引き続きよろしくお願いします。", resolved: true };
  }
  return { line: REACTION[flow.next_stage] ?? "それで、どうしてくれるんですか？", resolved: false };
}
