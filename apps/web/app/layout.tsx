import "./globals.css";
import type { ReactNode } from "react";
import { Header } from "../components/common/Header";
import { DemoBanner } from "../components/common/DemoBanner";

export const metadata = {
  title: "ComplaintOps Copilot",
  description: "クレーム対応中の人間を守るAIエージェント",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <DemoBanner />
        <Header />
        {children}
      </body>
    </html>
  );
}
