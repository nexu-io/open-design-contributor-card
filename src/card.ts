import { tierFromPoints } from "./tiers";
import type { CardModel } from "./types";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function cardObjectKey(eventId: string): string {
  return `cards/${eventId}.svg`;
}

export function renderContributorCard(card: CardModel): Uint8Array {
  const tier = tierFromPoints(card.points);
  const topPercent = Math.min(99.9, Math.max(0.1, (card.rank / Math.max(1, card.totalContributors)) * 100));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="${escapeXml(tier.nameEn)} card for @${escapeXml(card.username)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" rx="48" fill="url(#bg)" />
  <rect x="44" y="44" width="992" height="1262" rx="36" fill="#0b1220" stroke="${tier.accent}" stroke-width="4" />
  <text x="88" y="140" fill="#94a3b8" font-size="36" font-family="Inter, Arial, sans-serif">OPEN DESIGN CONTRIBUTOR CARD</text>
  <text x="88" y="238" fill="#ffffff" font-size="72" font-weight="700" font-family="Inter, Arial, sans-serif">@${escapeXml(card.username)}</text>
  <text x="88" y="320" fill="${tier.accent}" font-size="48" font-weight="700" font-family="Inter, Arial, sans-serif">${escapeXml(tier.emoji)} ${escapeXml(tier.nameEn.toUpperCase())}</text>

  <text x="88" y="500" fill="#e2e8f0" font-size="44" font-family="Inter, Arial, sans-serif">POINTS</text>
  <text x="88" y="620" fill="#ffffff" font-size="120" font-weight="700" font-family="Inter, Arial, sans-serif">${card.points.toLocaleString()}</text>

  <text x="88" y="760" fill="#e2e8f0" font-size="44" font-family="Inter, Arial, sans-serif">RANK</text>
  <text x="88" y="850" fill="#ffffff" font-size="72" font-weight="700" font-family="Inter, Arial, sans-serif">#${card.rank}</text>
  <text x="270" y="850" fill="#94a3b8" font-size="40" font-family="Inter, Arial, sans-serif">top ${topPercent.toFixed(1)}%</text>

  <text x="88" y="980" fill="#e2e8f0" font-size="44" font-family="Inter, Arial, sans-serif">ACTIVITY</text>
  <text x="88" y="1060" fill="#ffffff" font-size="38" font-family="Inter, Arial, sans-serif">PRs merged: ${card.prsMerged}</text>
  <text x="88" y="1120" fill="#ffffff" font-size="38" font-family="Inter, Arial, sans-serif">Reviews: ${card.reviews}</text>
  <text x="88" y="1180" fill="#ffffff" font-size="38" font-family="Inter, Arial, sans-serif">Issues opened: ${card.issuesOpened}</text>
  <text x="88" y="1240" fill="#ffffff" font-size="38" font-family="Inter, Arial, sans-serif">Threads commented: ${card.commentedThreads}</text>

  <text x="992" y="1190" text-anchor="end" fill="#e2e8f0" font-size="38" font-family="Inter, Arial, sans-serif">${escapeXml(tier.sloganEn)}</text>
  <text x="992" y="1250" text-anchor="end" fill="#94a3b8" font-size="26" font-family="Inter, Arial, sans-serif">Among ${card.totalContributors} contributors</text>
</svg>`.trim();
  return new TextEncoder().encode(svg);
}
