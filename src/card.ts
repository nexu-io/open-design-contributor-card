import type { CardModel } from "./types";

export function cardObjectKey(eventId: string): string {
  return `cards/${eventId}.png`;
}

export function legacySvgCardObjectKey(eventId: string): string {
  return `cards/${eventId}.svg`;
}

export async function renderContributorCard(card: CardModel): Promise<Uint8Array> {
  const { defaultRenderOpts, renderCardPng } = await import("./render");
  return renderCardPng(card.tierKey, {
    username: card.username,
    avatarUrl: card.avatarUrl,
    rank: card.rank,
    totalContributors: card.totalContributors,
    topPercent: card.topPercent,
    points: card.points,
    streakWeeks: card.streakWeeks,
    prsMerged: card.prsMerged,
    reviews: card.reviews,
    discussionsAnswered: card.commentedThreads,
    issuesAccepted: card.issuesOpened,
  }, await defaultRenderOpts());
}
