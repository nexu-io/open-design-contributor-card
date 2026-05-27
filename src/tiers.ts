import type { TierKey } from "./types";

export interface TierDef {
  key: TierKey;
  emoji: string;
  nameEn: string;
  nameCn: string;
  threshold: number;
  accent: string;
  sloganEn: string;
  sloganCn: string;
  encouragementEn: string;
  encouragementCn: string;
}

export const TIERS: readonly TierDef[] = [
  {
    key: "spark",
    emoji: "✨",
    nameEn: "Da Vinci",
    nameCn: "达芬奇",
    threshold: 0,
    accent: "#FCD34D",
    sloganEn: "Lit the spark.",
    sloganCn: "点燃第一束火花。",
    encouragementEn:
      "Every great contribution starts with a single spark. You showed up — that is the hardest step.",
    encouragementCn:
      "每一个伟大的贡献都从一束微小的火花开始。你来了——这就是最难的一步。",
  },
  {
    key: "signal",
    emoji: "📡",
    nameEn: "Giotto",
    nameCn: "乔托",
    threshold: 30,
    accent: "#22D3EE",
    sloganEn: "Sending steady signals.",
    sloganCn: "发出第一道信号。",
    encouragementEn:
      "Your contributions send a clear signal across the network: you care about making Open Design better.",
    encouragementCn:
      "你的贡献向整个网络发出了一个清晰的信号：你在认真让 Open Design 变得更好。",
  },
  {
    key: "node",
    emoji: "🔵",
    nameEn: "Praxiteles",
    nameCn: "普拉克西特列斯",
    threshold: 150,
    accent: "#3B82F6",
    sloganEn: "Holding the network together.",
    sloganCn: "撑起网络的节点。",
    encouragementEn:
      "You became a node others can rely on, build on, and connect through.",
    encouragementCn:
      "你已经长成了一个别人可以依靠、可以连接、可以建造的节点。",
  },
  {
    key: "beacon",
    emoji: "🗼",
    nameEn: "Phidias",
    nameCn: "菲狄亚斯",
    threshold: 700,
    accent: "#F59E0B",
    sloganEn: "Guiding the way for others.",
    sloganCn: "为他人指引方向。",
    encouragementEn:
      "New contributors look to your reviews, judgement, and taste. You are shaping how Open Design feels.",
    encouragementCn:
      "新人会看向你的 review、判断和品味。你正在塑造 Open Design 的气质。",
  },
  {
    key: "nova",
    emoji: "🌟",
    nameEn: "Imhotep",
    nameCn: "印何阗",
    threshold: 2500,
    accent: "#67E8F9",
    sloganEn: "Bright as a Nova.",
    sloganCn: "如新星般璀璨。",
    encouragementEn:
      "You did not just help — you defined what Open Design could become.",
    encouragementCn:
      "你不只是帮过忙——你定义了 Open Design 能成为什么样子。",
  },
] as const;

export function tierFromPoints(points: number): TierDef {
  let current = TIERS[0]!;
  for (const tier of TIERS) {
    if (points >= tier.threshold) current = tier;
  }
  return current;
}

export function nextTier(key: TierKey): TierDef | null {
  const index = TIERS.findIndex((tier) => tier.key === key);
  if (index < 0 || index === TIERS.length - 1) return null;
  return TIERS[index + 1] ?? null;
}

export function tierOrder(key: TierKey): number {
  return TIERS.findIndex((tier) => tier.key === key);
}
