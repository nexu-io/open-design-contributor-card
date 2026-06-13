import { describe, expect, it } from "vitest";
import { eventScoreFloor, resolveCurrentScore, weightedScoreFromStats } from "../src/scoring";

describe("weightedScoreFromStats", () => {
  it("uses first merge bonus once", () => {
    expect(weightedScoreFromStats({ prsMerged: 1, reviews: 0, issuesOpened: 0, commentedThreads: 0 })).toBe(30);
    expect(weightedScoreFromStats({ prsMerged: 2, reviews: 0, issuesOpened: 0, commentedThreads: 0 })).toBe(42);
  });
});

describe("eventScoreFloor", () => {
  it("returns merged PR deltas", () => {
    expect(eventScoreFloor({ actor: { login: "alice" }, eventDelta: 1, canComment: true, reason: "merged PR" }, { prsMerged: 1, reviews: 0, issuesOpened: 0, commentedThreads: 0 })).toBe(30);
    expect(eventScoreFloor({ actor: { login: "alice" }, eventDelta: 1, canComment: true, reason: "merged PR" }, { prsMerged: 2, reviews: 0, issuesOpened: 0, commentedThreads: 0 })).toBe(12);
  });
});

describe("resolveCurrentScore", () => {
  it("takes the max of vaunt, weighted and event floors", () => {
    const result = resolveCurrentScore({
      vauntScore: 18,
      stats: { prsMerged: 1, reviews: 1, issuesOpened: 0, commentedThreads: 0 },
      existing: {
        login: "alice",
        avatarUrl: null,
        lastAnnouncedTier: "spark",
        lastKnownScore: 5,
        lastCheckedAt: "2026-05-27T00:00:00.000Z",
        lastAnnouncedAt: null,
        scoreVersion: "weighted-v1",
        lastRank: 0,
        lastTotalContributors: 0,
        lastVauntScore: null,
        lastWeightedScore: 0,
        lastReason: null,
      },
      context: {
        actor: { login: "alice" },
        eventDelta: 1,
        canComment: true,
        reason: "merged PR",
      },
    });

    expect(result.currentScore).toBe(34);
  });

  it("does not add an event floor to existing state on reruns", () => {
    const result = resolveCurrentScore({
      vauntScore: 10,
      stats: { prsMerged: 0, reviews: 0, issuesOpened: 6, commentedThreads: 40 },
      existing: {
        login: "alice",
        avatarUrl: null,
        lastAnnouncedTier: "signal",
        lastKnownScore: 75,
        lastCheckedAt: "2026-05-27T00:00:00.000Z",
        lastAnnouncedAt: null,
        scoreVersion: "weighted-v1",
        lastRank: 0,
        lastTotalContributors: 0,
        lastVauntScore: 10,
        lastWeightedScore: 70,
        lastReason: "opened issue",
      },
      context: {
        actor: { login: "alice" },
        eventDelta: 1,
        canComment: true,
        reason: "opened issue",
      },
    });

    expect(result.currentScore).toBe(70);
  });
});
