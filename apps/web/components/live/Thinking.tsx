export function Thinking({ show, label = "AIが対応を考えています" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="thinking" role="status" aria-live="polite">
      <span className="spinner" />
      <span className="label">{label}</span>
    </div>
  );
}
