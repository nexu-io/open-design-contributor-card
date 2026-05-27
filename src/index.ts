import { renderContributorCard, cardObjectKey } from "./card";
import { tierUpComment, welcomeSparkComment } from "./comments";
import { extractContext, isBotLogin, shouldAnnounce } from "./context";
import { GitHubAppClient } from "./github";
import { resolveCurrentScore, SCORE_VERSION, weightedScoreFromStats } from "./scoring";
import { recordShareClick, getContributorState, getIngestionEvent, insertCardEvent, recordIngestionEvent, upsertContributorState } from "./storage";
import { repoCampaignUrl, trackedShareUrl } from "./share";
import { writeLeaderboardSnapshot } from "./snapshot";
import { tierFromPoints } from "./tiers";
import { fetchVauntContributorLookup } from "./vaunt";
import type { CardEventRecord, CardModel, RelayEnvelope } from "./types";

type RuntimeEnv = Env & {
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  WORKFLOW_WEBHOOK_SECRET?: string;
};

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function requiredSecret(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function hmacHex(secret: string, payload: ArrayBuffer): Promise<string> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  ).then((key) => crypto.subtle.sign("HMAC", key, payload)).then((buffer) =>
    Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

async function verifyRelaySignature(request: Request, secret: string): Promise<Uint8Array> {
  const raw = await request.arrayBuffer();
  const bytes = new Uint8Array(raw);
  const header = request.headers.get("x-open-design-signature") ?? "";
  const expected = `sha256=${await hmacHex(secret, raw)}`;
  if (header !== expected) {
    throw new Response("invalid signature", { status: 401 });
  }
  return bytes;
}

function parseRepository(repository: string): { owner: string; repo: string; repoUrl: string } {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) throw new Error(`Invalid repository: ${repository}`);
  return { owner, repo, repoUrl: `https://github.com/${owner}/${repo}` };
}

function cardEventDedupeKey(event: { recipientLogin: string; tierKey: string; surface: string; createdAt: string }): string {
  const bucket = Math.floor(new Date(event.createdAt).getTime() / (5 * 60 * 1000));
  return `${event.recipientLogin.toLowerCase()}:${event.tierKey}:${event.surface}:${bucket}`;
}

function cardUrl(publicBaseUrl: string, eventId: string): string {
  return `${publicBaseUrl.replace(/\/$/, "")}/cards/${encodeURIComponent(eventId)}.svg`;
}

async function processRelay(env: RuntimeEnv, envelope: RelayEnvelope): Promise<Response> {
  const context = extractContext(envelope.eventName, envelope.payload as any);
  if (!context) {
    return json({ ok: true, skipped: true, reason: "unsupported_event" });
  }

  if (!context.actor.login || isBotLogin(context.actor.login)) {
    return json({ ok: true, skipped: true, reason: "bot_or_missing_actor" });
  }

  if (envelope.deliveryId) {
    const existingDelivery = await getIngestionEvent(env.DB, envelope.deliveryId);
    if (existingDelivery) {
      return json({ ok: true, duplicate: true, deliveryId: envelope.deliveryId });
    }
  }

  const { owner, repo, repoUrl } = parseRepository(envelope.repository);
  const github = new GitHubAppClient(
    requiredSecret(env.GITHUB_APP_ID, "GITHUB_APP_ID"),
    requiredSecret(env.GITHUB_APP_INSTALLATION_ID, "GITHUB_APP_INSTALLATION_ID"),
    requiredSecret(env.GITHUB_APP_PRIVATE_KEY, "GITHUB_APP_PRIVATE_KEY"),
  );

  const [vauntLookup, stats, existing] = await Promise.all([
    fetchVauntContributorLookup(owner, repo, context.actor.login),
    github.fetchContributorStats(owner, repo, context.actor.login),
    getContributorState(env.DB, context.actor.login),
  ]);

  const { currentScore, sources } = resolveCurrentScore({
    vauntScore: vauntLookup.score?.score,
    stats,
    existing,
    context,
  });
  const currentTier = tierFromPoints(currentScore);
  const rank = vauntLookup.score?.rank ?? vauntLookup.totalContributors + 1;
  const totalContributors = Math.max(vauntLookup.totalContributors, rank);
  const decision = shouldAnnounce(currentTier.key, existing);

  const card: CardModel = {
    username: context.actor.login,
    rank,
    totalContributors,
    points: currentScore,
    tierKey: currentTier.key,
    tierName: currentTier.nameEn,
    prsMerged: stats.prsMerged,
    reviews: stats.reviews,
    issuesOpened: stats.issuesOpened,
    commentedThreads: stats.commentedThreads,
  };

  let cardEventId: string | null = null;
  let outcome = decision.announce ? "announced_without_comment_surface" : "no_announcement";

  if (decision.announce && context.canComment && context.threadNumber !== undefined) {
    const createdAt = new Date().toISOString();
    const eventId = `${context.actor.login}-${decision.tierKey}-${createdAt.replace(/[:.]/g, "-")}`;
    const objectKey = cardObjectKey(eventId);
    await env.CARD_ASSETS.put(objectKey, renderContributorCard(card), {
      httpMetadata: { contentType: "image/svg+xml; charset=utf-8" },
    });

    const commentBody = decision.scenario === "welcome-spark"
      ? welcomeSparkComment(card, cardUrl(env.PUBLIC_BASE_URL, eventId), env.PUBLIC_BASE_URL, repoUrl, stats.prsMerged + stats.reviews + stats.issuesOpened + stats.commentedThreads <= 1, eventId)
      : tierUpComment(card, cardUrl(env.PUBLIC_BASE_URL, eventId), env.PUBLIC_BASE_URL, repoUrl, eventId);

    const comment = await github.postIssueComment(owner, repo, context.threadNumber, commentBody);
    const eventRecord: CardEventRecord = {
      eventId,
      deliveryId: envelope.deliveryId ?? null,
      recipientLogin: context.actor.login,
      tierKey: decision.tierKey,
      tierName: currentTier.nameEn,
      scenario: decision.scenario,
      surface: context.surface ?? "issue",
      threadNumber: context.threadNumber,
      threadUrl: comment.html_url.split("#")[0] ?? null,
      commentUrl: comment.html_url,
      cardObjectKey: objectKey,
      shareUrl: trackedShareUrl(env.PUBLIC_BASE_URL, eventId),
      dedupeKey: cardEventDedupeKey({ recipientLogin: context.actor.login, tierKey: decision.tierKey, surface: context.surface ?? "issue", createdAt: comment.created_at }),
      points: currentScore,
      rank,
      totalContributors,
      createdAt: comment.created_at,
    };
    await insertCardEvent(env.DB, eventRecord);
    cardEventId = eventId;
    outcome = "comment_posted";
  }

  const now = new Date().toISOString();
  await upsertContributorState(env.DB, {
    login: context.actor.login,
    avatarUrl: context.actor.avatarUrl ?? null,
    lastAnnouncedTier: cardEventId ? decision.tierKey : existing?.lastAnnouncedTier ?? "spark",
    lastKnownScore: currentScore,
    lastCheckedAt: now,
    lastAnnouncedAt: cardEventId ? now : existing?.lastAnnouncedAt ?? null,
    scoreVersion: SCORE_VERSION,
    lastRank: rank,
    lastTotalContributors: totalContributors,
    lastVauntScore: vauntLookup.score?.score ?? null,
    lastWeightedScore: weightedScoreFromStats(stats),
    lastReason: context.reason,
  });

  if (envelope.deliveryId) {
    await recordIngestionEvent(env.DB, {
      deliveryId: envelope.deliveryId,
      eventName: envelope.eventName,
      action: envelope.action ?? null,
      actorLogin: context.actor.login,
      outcome,
      cardEventId,
    });
  }

  return json({
    ok: true,
    actor: context.actor.login,
    currentScore,
    currentTier: currentTier.key,
    announce: decision.announce,
    commented: Boolean(cardEventId),
    sources,
    cardEventId,
  });
}

async function handleCardAsset(env: RuntimeEnv, url: URL): Promise<Response> {
  const eventId = url.pathname.replace(/^\/cards\//, "").replace(/\.svg$/, "");
  const object = await env.CARD_ASSETS.get(cardObjectKey(eventId));
  if (!object) return new Response("not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

async function handleShare(env: RuntimeEnv, url: URL): Promise<Response> {
  const eventId = url.pathname.replace(/^\/share\//, "");
  await recordShareClick(env.DB, eventId, "share", null, null);
  const repository = url.searchParams.get("repo") ?? "https://github.com/nexu-io/open-design";
  return Response.redirect(repoCampaignUrl(repository, eventId), 302);
}

async function handleShareOut(env: RuntimeEnv, url: URL): Promise<Response> {
  const eventId = url.pathname.replace(/^\/share-out\//, "");
  const destination = url.searchParams.get("to");
  if (!destination) return new Response("missing destination", { status: 400 });
  const lang = url.searchParams.get("lang");
  await recordShareClick(env.DB, eventId, "share_out", lang, destination);
  return Response.redirect(destination, 302);
}

export default {
  async fetch(request, env: RuntimeEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ ok: true });
    }

    if (request.method === "GET" && url.pathname.startsWith("/cards/")) {
      return handleCardAsset(env, url);
    }

    if (request.method === "GET" && url.pathname.startsWith("/share/")) {
      return handleShare(env, url);
    }

    if (request.method === "GET" && url.pathname.startsWith("/share-out/")) {
      return handleShareOut(env, url);
    }

    if (request.method === "POST" && url.pathname === "/api/github/events") {
      const secret = requiredSecret(env.WORKFLOW_WEBHOOK_SECRET, "WORKFLOW_WEBHOOK_SECRET");
      const bytes = await verifyRelaySignature(request, secret);
      const envelope = JSON.parse(new TextDecoder().decode(bytes)) as RelayEnvelope;
      return processRelay(env, envelope);
    }

    return new Response("not found", { status: 404 });
  },

  async scheduled(_controller, env: RuntimeEnv, ctx): Promise<void> {
    ctx.waitUntil(writeLeaderboardSnapshot(env));
  },
} satisfies ExportedHandler<Env>;
