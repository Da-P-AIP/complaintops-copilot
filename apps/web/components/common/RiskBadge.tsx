import type { RiskLevel } from "@complaintops/shared";

const LABEL: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "重大",
};

const COLOR: Record<RiskLevel, string> = {
  low: "#34d399",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 14px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 15,
        color: "#06283d",
        background: COLOR[level],
      }}
    >
      危険度：{LABEL[level]}
    </span>
  );
}
