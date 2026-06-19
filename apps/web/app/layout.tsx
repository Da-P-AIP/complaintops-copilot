import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ComplaintOps Copilot",
  description: "クレーム対応中の人間を守るAIエージェント",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
