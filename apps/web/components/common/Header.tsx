import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          <span className="dot" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span>ComplaintOps <span className="api">Copilot</span></span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.02em" }}>社内暗黙知OS</span>
          </span>
        </Link>
        <nav className="nav">
          <Link href="/">ホーム</Link>
          <Link href="/console">対応コンソール</Link>
          <Link href="/admin">管理</Link>
          <Link href="/security">安全性</Link>
          <Link href="/settings">設定</Link>
        </nav>
      </div>
    </header>
  );
}
