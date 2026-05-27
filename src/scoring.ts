import type { ContributorStats, ContributorStateEntry, EventContext } from "./types";

export const SCORE_VERSION = "weighted-v1";

export const SCORE_WEIGHTS = {
  firstMergedPr: 30,
  subsequentMergedPr: 12,
  review: 3,
  issueOpened: 5,
  comment: 1,
  discussion: 2,
} as const;

export function weightedScoreFromStats(stats: ContributorStats): number {
  const prScore = stats.prsMerged > 0
    ? SCORE_WEIGHTS.firstMergedPr + Math.max(0, stats.prsMerged - 1) * SCORE_WEIGHTS.subsequentMergedPr
    : 0;

  return (
    prScore +
    stats.reviews * SCORE_WEIGHTS.review +
    stats.issuesOpened * SCORE_WEIGHTS.issueOpened +
    stats.commentedThreads * SCORE_WEIGHTS.comment
  );
}

export function eventScoreFloor(context: EventContext, stats: ContributorStats): number {
  switch (context.reason) {
    case "merged PR":
      return stats.prsMerged <= 1 ? SCORE_WEIGHTS.firstMergedPr : SCORE_WEIGHTS.subsequentMergedPr;
    case "opened issue":
      return SCORE_WEIGHTS.issueOpened;
    case "submitted PR review":
      return SCORE_WEIGHTS.review;
    case "created issue/PR comment":
    case "created PR review comment":
      return SCORE_WEIGHTS.comment;
    case "created discussion":
    case "created discussion comment":
      return SCORE_WEIGHTS.discussion;
    default:
      return context.eventDelta;
  }
}

export function resolveCurrentScore(args: {
  vauntScore?: number;
  stats: ContributorStats;
  existing?: ContributorStateEntry | null;
  context: EventContext;
}): { currentScore: number; sources: { vauntRankScore: number; githubWeighted: number; state: number; event: number } } {
  const vauntRankScore = args.vauntScore ?? 0;
  const githubWeighted = weightedScoreFromStats(args.stats);
  const event = eventScoreFloor(args.context, args.stats);
  const state = args.existing?.scoreVersion === SCORE_VERSION ? args.existing.lastKnownScore + event : 0;

  return {
    currentScore: Math.max(vauntRankScore, githubWeighted, state, event),
    sources: { vauntRankScore, githubWeighted, state, event },
  };
}
