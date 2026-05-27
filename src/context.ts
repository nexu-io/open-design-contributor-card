import type { EventContext, RecognitionScenario, TierKey } from "./types";
import { tierOrder } from "./tiers";

function userShape(user: { login?: string; avatar_url?: string } | null | undefined) {
  return { login: user?.login ?? "", avatarUrl: user?.avatar_url ?? null };
}

export function extractContext(eventName: string, event: any): EventContext | null {
  if (eventName === "pull_request_target" && event.action === "closed" && event.pull_request?.merged) {
    return {
      actor: userShape(event.pull_request.user),
      threadNumber: event.pull_request.number,
      eventDelta: 1,
      canComment: true,
      reason: "merged PR",
      surface: "pull_request",
    };
  }

  if (eventName === "issues" && event.action === "opened") {
    return {
      actor: userShape(event.issue.user),
      threadNumber: event.issue.number,
      eventDelta: 1,
      canComment: true,
      reason: "opened issue",
      surface: "issue",
    };
  }

  if (eventName === "pull_request_review" && event.action === "submitted") {
    return {
      actor: userShape(event.review.user),
      threadNumber: event.pull_request.number,
      eventDelta: 1,
      canComment: true,
      reason: "submitted PR review",
      surface: "pull_request",
    };
  }

  if (eventName === "issue_comment" && event.action === "created") {
    return {
      actor: userShape(event.comment.user),
      threadNumber: event.issue.number,
      eventDelta: 1,
      canComment: true,
      reason: "created issue/PR comment",
      surface: event.issue?.pull_request ? "pull_request" : "issue",
    };
  }

  if (eventName === "pull_request_review_comment" && event.action === "created") {
    return {
      actor: userShape(event.comment.user),
      threadNumber: event.pull_request.number,
      eventDelta: 1,
      canComment: true,
      reason: "created PR review comment",
      surface: "pull_request",
    };
  }

  if (eventName === "discussion" && event.action === "created") {
    return {
      actor: userShape(event.discussion.user),
      eventDelta: 1,
      canComment: false,
      reason: "created discussion",
      surface: "discussion",
    };
  }

  if (eventName === "discussion_comment" && event.action === "created") {
    return {
      actor: userShape(event.comment.user),
      eventDelta: 1,
      canComment: false,
      reason: "created discussion comment",
      surface: "discussion",
    };
  }

  return null;
}

export function shouldAnnounce(currentTier: TierKey, existing?: { lastAnnouncedTier: TierKey } | null): {
  announce: boolean;
  scenario: RecognitionScenario;
  tierKey: TierKey;
} {
  if (existing) {
    return {
      announce: tierOrder(currentTier) > tierOrder(existing.lastAnnouncedTier),
      scenario: currentTier === "spark" ? "welcome-spark" : "tier-up",
      tierKey: currentTier,
    };
  }

  return {
    announce: true,
    scenario: currentTier === "spark" ? "welcome-spark" : "tier-up",
    tierKey: currentTier,
  };
}

export function isBotLogin(login: string): boolean {
  return /\[bot\]$/i.test(login) || /^bot-/i.test(login) || /-bot$/i.test(login);
}
