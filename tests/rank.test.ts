import { describe, expect, it } from "vitest";
import { fuzzyContributorCount, localRankFromScores, rankSummary, topPercent } from "../src/rank";

describe("rank helpers", () => {
  it("formats contributor counts like sandbox", () => {
    expect(fuzzyContributorCount(42)).toBe("42");
    expect(fuzzyContributorCount(199)).toBe("100+");
  });

  it("formats rank summary like sandbox", () => {
    expect(rankSummary(12, 199)).toBe("Rank #12 among 100+ contributors");
  });

  it("clamps top percent like sandbox", () => {
    expect(topPercent(1, 1)).toBe(99);
    expect(topPercent(1, 10)).toBe(10);
    expect(topPercent(999, 1000)).toBe(99);
  });

  it("computes local rank from contributor scores without bogus fallback", () => {
    expect(localRankFromScores([], "alice", 5)).toEqual({ rank: 1, totalContributors: 1 });
    expect(localRankFromScores([
      { login: "bob", score: 12 },
      { login: "carol", score: 8 },
    ], "alice", 5)).toEqual({ rank: 3, totalContributors: 3 });
  });
});
