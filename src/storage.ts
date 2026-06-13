import type { CardEventRecord, ContributorStateEntry } from "./types";

export async function getContributorState(db: D1Database, login: string): Promise<ContributorStateEntry | null> {
  const row = await db.prepare(`
    SELECT
      login,
      avatar_url,
      last_announced_tier,
      last_known_score,
      last_checked_at,
      last_announced_at,
      score_version,
      last_rank,
      last_total_contributors,
      last_vaunt_score,
      last_weighted_score,
      last_reason,
      prs_merged,
      reviews,
      issues_accepted,
      discussions_answered,
      streak_weeks
    FROM contributors
    WHERE login = ?1
  `).bind(login.toLowerCase()).first<any>();

  if (!row) return null;
  return {
    login: row.login,
    avatarUrl: row.avatar_url,
    lastAnnouncedTier: row.last_announced_tier,
    lastKnownScore: row.last_known_score,
    lastCheckedAt: row.last_checked_at,
    lastAnnouncedAt: row.last_announced_at,
    scoreVersion: row.score_version,
    lastRank: row.last_rank,
    lastTotalContributors: row.last_total_contributors,
    lastVauntScore: row.last_vaunt_score,
    lastWeightedScore: row.last_weighted_score,
    lastReason: row.last_reason,
    prsMerged: row.prs_merged,
    reviews: row.reviews,
    issuesOpened: row.issues_accepted,
    commentedThreads: row.discussions_answered,
    streakWeeks: row.streak_weeks,
  };
}

export async function listContributorScores(db: D1Database): Promise<Array<{ login: string; score: number }>> {
  const result = await db.prepare(`
    SELECT login, last_known_score
    FROM contributors
  `).all<{ login: string; last_known_score: number }>();

  return result.results.map((row) => ({
    login: row.login,
    score: row.last_known_score,
  }));
}

export async function upsertContributorState(db: D1Database, state: ContributorStateEntry): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO contributors (
      login, avatar_url, last_announced_tier, last_known_score, last_checked_at, last_announced_at,
      score_version, last_rank, last_total_contributors, last_vaunt_score, last_weighted_score,
      last_reason, created_at, updated_at, prs_merged, reviews, issues_accepted, discussions_answered
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15, ?16, ?17)
    ON CONFLICT(login) DO UPDATE SET
      avatar_url = excluded.avatar_url,
      last_announced_tier = excluded.last_announced_tier,
      last_known_score = excluded.last_known_score,
      last_checked_at = excluded.last_checked_at,
      last_announced_at = excluded.last_announced_at,
      score_version = excluded.score_version,
      last_rank = excluded.last_rank,
      last_total_contributors = excluded.last_total_contributors,
      last_vaunt_score = excluded.last_vaunt_score,
      last_weighted_score = excluded.last_weighted_score,
      last_reason = excluded.last_reason,
      prs_merged = excluded.prs_merged,
      reviews = excluded.reviews,
      issues_accepted = excluded.issues_accepted,
      discussions_answered = excluded.discussions_answered,
      updated_at = excluded.updated_at
  `).bind(
    state.login.toLowerCase(),
    state.avatarUrl,
    state.lastAnnouncedTier,
    state.lastKnownScore,
    state.lastCheckedAt,
    state.lastAnnouncedAt,
    state.scoreVersion,
    state.lastRank,
    state.lastTotalContributors,
    state.lastVauntScore,
    state.lastWeightedScore,
    state.lastReason,
    now,
    state.prsMerged ?? 0,
    state.reviews ?? 0,
    state.issuesOpened ?? 0,
    state.commentedThreads ?? 0,
  ).run();
}

export async function insertCardEvent(db: D1Database, event: CardEventRecord): Promise<void> {
  await db.prepare(`
    INSERT INTO card_events (
      event_id, delivery_id, recipient_login, tier_key, tier_name, scenario, surface,
      thread_number, thread_url, comment_url, card_object_key, share_url, dedupe_key,
      points, rank, total_contributors, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
  `).bind(
    event.eventId,
    event.deliveryId,
    event.recipientLogin.toLowerCase(),
    event.tierKey,
    event.tierName,
    event.scenario,
    event.surface,
    event.threadNumber,
    event.threadUrl,
    event.commentUrl,
    event.cardObjectKey,
    event.shareUrl,
    event.dedupeKey,
    event.points,
    event.rank,
    event.totalContributors,
    event.createdAt,
  ).run();
}

export async function recordIngestionEvent(
  db: D1Database,
  args: {
    deliveryId: string;
    eventName: string;
    action: string | null;
    actorLogin: string | null;
    outcome: string;
    cardEventId: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO ingestion_events (delivery_id, event_name, action, actor_login, outcome, card_event_id, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
    ON CONFLICT(delivery_id) DO UPDATE SET
      action = excluded.action,
      actor_login = excluded.actor_login,
      outcome = excluded.outcome,
      card_event_id = excluded.card_event_id,
      updated_at = excluded.updated_at
  `).bind(
    args.deliveryId,
    args.eventName,
    args.action,
    args.actorLogin,
    args.outcome,
    args.cardEventId,
    now,
  ).run();
}

export async function getIngestionEvent(db: D1Database, deliveryId: string): Promise<{ delivery_id: string } | null> {
  return db.prepare(`SELECT delivery_id FROM ingestion_events WHERE delivery_id = ?1`).bind(deliveryId).first<{ delivery_id: string }>();
}

export async function recordShareClick(
  db: D1Database,
  eventId: string,
  kind: "share" | "share_out",
  lang: string | null,
  destination: string | null,
): Promise<void> {
  await db.prepare(`
    INSERT INTO share_clicks (event_id, kind, lang, destination, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(eventId, kind, lang, destination, new Date().toISOString()).run();
}

export async function listLeaderboard(db: D1Database, limit = 50): Promise<Array<Record<string, unknown>>> {
  const result = await db.prepare(`
    SELECT login, last_announced_tier, last_known_score, last_rank, last_total_contributors, last_checked_at, last_announced_at
    FROM contributors
    ORDER BY last_known_score DESC, login ASC
    LIMIT ?1
  `).bind(limit).all<Record<string, unknown>>();
  return result.results;
}
