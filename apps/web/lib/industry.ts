// 業種ごとの見た目（色・アイコン）と業種別サンプル発話。
// 構成は変えず、アクセント色とサンプルだけ業種に寄せる。
export interface IndustryMeta {
  id: string;
  label: string;
  icon: string;
  color: string;
  samples: string[];
}

export const INDUSTRIES: Record<string, IndustryMeta> = {
  ec: {
    id: "ec",
    label: "EC・通販",
    icon: "📦",
    color: "#38bdf8",
    samples: [
      "壊れた商品が届きました。こんな対応ならSNSに書きます。ちゃんと返金してください。",
      "注文した商品がまだ届きません。どうなっていますか。",
      "頼んだものと違う商品が届きました。",
    ],
  },
  care: {
    id: "care",
    label: "介護・福祉",
    icon: "🏥",
    color: "#34d399",
    samples: [
      "送迎の時間に職員さんが来てくれませんでした。",
      "母への対応が冷たかったと家族から聞いています。説明してください。",
      "支援の内容が最初の説明と違います。",
    ],
  },
  food: {
    id: "food",
    label: "飲食",
    icon: "🍽️",
    color: "#fb923c",
    samples: [
      "料理に髪の毛が入っていました。衛生管理はどうなっているんですか。",
      "予約していたのに席が用意されていませんでした。",
      "料理の提供がとても遅かったです。",
    ],
  },
  saas: {
    id: "saas",
    label: "SaaS",
    icon: "💻",
    color: "#818cf8",
    samples: [
      "朝からログインできず、業務が止まっています。損害賠償ものですよ。",
      "請求金額が契約内容と違います。",
      "データが消えました。弁護士に相談します。",
    ],
  },
  mfg: {
    id: "mfg",
    label: "製造",
    icon: "🏭",
    color: "#f59e0b",
    samples: [
      "納品された部品に不良がありました。すぐ交換してください。",
      "納期に間に合っていません。どうしてくれるんですか。",
      "仕様と違うものが届きました。",
    ],
  },
};

export function industryOf(id?: string): IndustryMeta {
  return (id && INDUSTRIES[id]) || INDUSTRIES.ec;
}
