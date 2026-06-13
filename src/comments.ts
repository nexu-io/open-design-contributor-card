import { nextTier, tierFromPoints } from "./tiers";
import { rankSummary } from "./rank";
import { xShareUrl } from "./share";
import type { CardModel } from "./types";

export function tierUpComment(card: CardModel, cardImageUrl: string, publicBaseUrl: string, repoUrl: string, eventId: string): string {
  const tier = tierFromPoints(card.points);
  const xUrl = xShareUrl(publicBaseUrl, repoUrl, card, "en", eventId);
  const xUrlCn = xShareUrl(publicBaseUrl, repoUrl, card, "cn", eventId);

  return [
    `### 🎉 ${tier.emoji} You just leveled up to **${tier.nameEn}**`,
    "",
    `<img src="${cardImageUrl}" width="540" alt="${tier.nameEn} card for @${card.username}" />`,
    "",
    `> ${tier.emoji} ✨ *${tier.sloganEn}*`,
    "",
    `🙌 **${tier.encouragementEn}**`,
    "",
    "💛 Thanks for helping Open Design move forward. Keep building in the open. 🚀",
    "",
    "---",
    "",
    `📊 ${rankSummary(card.rank, card.totalContributors)}`,
    "",
    `🔗 [Share on X (English)](${xUrl}) · [分享到 X（中文）](${xUrlCn})`,
  ].join("\n");
}

export function welcomeSparkComment(card: CardModel, cardImageUrl: string, publicBaseUrl: string, repoUrl: string, isFirstContribution: boolean, eventId: string): string {
  const body = isFirstContribution
    ? "🌱 Your first contribution adds energy to the project. Thanks for showing up and helping Open Design grow."
    : "🌱 Every contribution adds energy to the project. Thanks for showing up and helping Open Design grow.";
  const xUrl = xShareUrl(publicBaseUrl, repoUrl, card, "en", eventId);
  const xUrlCn = xShareUrl(publicBaseUrl, repoUrl, card, "cn", eventId);

  return [
    `### 🎉 ✨ Welcome to **Open Design**, @${card.username}!`,
    "",
    `<img src="${cardImageUrl}" width="420" alt="Spark card for @${card.username}" />`,
    "",
    "> ✨ 🔥 *Lit the spark.*",
    "",
    body,
    "",
    "💛 Thanks for helping Open Design grow. Keep building in the open. 🚀",
    "",
    `🔗 [Share on X (English)](${xUrl}) · [分享到 X（中文）](${xUrlCn})`,
  ].join("\n");
}

export function noTierUpSummary(card: CardModel): string | null {
  const tier = tierFromPoints(card.points);
  const next = nextTier(tier.key);
  if (!next) return null;
  const remaining = next.threshold - card.points;
  return `<sub>${card.points} total · ${remaining} to **${next.nameEn}** ${next.emoji}</sub>`;
}
