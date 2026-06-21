"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimulateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/console#practice");
  }, [router]);
  return (
    <div className="container">
      <p className="hint">練習モードは「対応コンソール」に統合されました。移動しています…</p>
    </div>
  );
}
