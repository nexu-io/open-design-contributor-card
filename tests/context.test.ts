import { describe, expect, it } from "vitest";
import { extractContext, shouldAnnounce } from "../src/context";

describe("extractContext", () => {
  it("extracts merged PR events", () => {
    const context = extractContext("pull_request_target", {
      action: "closed",
      pull_request: {
        merged: true,
        number: 42,
        user: { login: "alice", avatar_url: "https://example.com/a.png" },
      },
    });

    expect(context).toMatchObject({
      actor: { login: "alice", avatarUrl: "https://example.com/a.png" },
      threadNumber: 42,
      canComment: true,
      reason: "merged PR",
      surface: "pull_request",
    });
  });

  it("returns null for unsupported events", () => {
    expect(extractContext("push", { ref: "refs/heads/main" })).toBeNull();
  });
});

describe("shouldAnnounce", () => {
  it("announces first touch", () => {
    expect(shouldAnnounce("spark", null)).toMatchObject({ announce: true, scenario: "welcome-spark" });
  });

  it("announces only tier upgrades", () => {
    expect(shouldAnnounce("signal", { lastAnnouncedTier: "spark" }).announce).toBe(true);
    expect(shouldAnnounce("signal", { lastAnnouncedTier: "signal" }).announce).toBe(false);
  });
});
