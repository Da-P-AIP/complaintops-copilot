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
          <Link href="/setup">初期設定</Link>
          <Link href="/simulate">練習</Link>
          <Link href="/settings">設定</Link>
        </nav>
      </div>
    </header>
  );
}
