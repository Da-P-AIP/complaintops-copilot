import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          <span className="dot" />
          ComplaintOps <span className="api">Copilot</span>
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
