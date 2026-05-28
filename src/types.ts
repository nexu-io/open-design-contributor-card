export type TierKey = "spark" | "signal" | "node" | "beacon" | "nova";
export type RecognitionScenario = "welcome-spark" | "tier-up";
export type ContributionSurface = "pull_request" | "issue" | "discussion";

export interface ContributorStats {
  prsMerged: number;
  reviews: number;
  issuesOpened: number;
  commentedThreads: number;
}

export interface ContributorStateEntry {
  login: string;
  avatarUrl: string | null;
  lastAnnouncedTier: TierKey;
  lastKnownScore: number;
  lastCheckedAt: string;
  lastAnnouncedAt: string | null;
  scoreVersion: string;
  lastRank: number;
  lastTotalContributors: number;
  lastVauntScore: number | null;
  lastWeightedScore: number;
  lastReason: string | null;
  prsMerged?: number;
  reviews?: number;
  issuesOpened?: number;
  commentedThreads?: number;
}

export interface CardModel {
  username: string;
  rank: number;
  totalContributors: number;
  points: number;
  tierKey: TierKey;
  tierName: string;
  prsMerged: number;
  reviews: number;
  issuesOpened: number;
  commentedThreads: number;
}

export interface EventContext {
  actor: { login: string; avatarUrl?: string | null };
  threadNumber?: number;
  eventDelta: number;
  canComment: boolean;
  reason: string;
  surface?: ContributionSurface;
}

export interface RelayEnvelope {
  repository: string;
  eventName: string;
  action?: string;
  deliveryId?: string;
  triggeredAt?: string;
  payload: unknown;
}

export interface CardEventRecord {
  eventId: string;
  deliveryId: string | null;
  recipientLogin: string;
  tierKey: TierKey;
  tierName: string;
  scenario: RecognitionScenario;
  surface: ContributionSurface;
  threadNumber: number | null;
  threadUrl: string | null;
  commentUrl: string | null;
  cardObjectKey: string;
  shareUrl: string;
  dedupeKey: string;
  points: number;
  rank: number;
  totalContributors: number;
  createdAt: string;
}
