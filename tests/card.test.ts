import { describe, expect, it } from "vitest";
import { cardObjectKey, legacySvgCardObjectKey } from "../src/card";
import { tierUpComment, welcomeSparkComment } from "../src/comments";
import type { CardModel } from "../src/types";

const card: CardModel = {
  username: "alice",
  avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  rank: 12,
  totalContributors: 199,
  topPercent: 6,
  points: 35,
  tierKey: "signal",
  tierName: "Giotto",
  streakWeeks: 0,
  prsMerged: 3,
  reviews: 4,
  issuesOpened: 2,
  commentedThreads: 1,
};

describe("card display", () => {
  it("stores cards as sandbox-style PNG assets", () => {
    expect(cardObjectKey("evt-1")).toBe("cards/evt-1.png");
    expect(legacySvgCardObjectKey("evt-1")).toBe("cards/evt-1.svg");
  });

  it("matches sandbox comment copy", () => {
    const tierUp = tierUpComment(card, "https://example.com/card.png", "https://public.example.com", "https://github.com/nexu-io/open-design", "evt-1");
    const welcome = welcomeSparkComment(card, "https://example.com/card.png", "https://public.example.com", "https://github.com/nexu-io/open-design", true, "evt-1");

    expect(tierUp).toContain("📊 Rank #12 among 100+ contributors");
    expect(welcome).toContain("🌱 Your first contribution adds energy to the project. Thanks for showing up and helping Open Design grow.");
  });
});
