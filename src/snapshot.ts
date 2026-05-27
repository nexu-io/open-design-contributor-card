import { listLeaderboard } from "./storage";

export async function writeLeaderboardSnapshot(env: Env): Promise<void> {
  const leaderboard = await listLeaderboard(env.DB, 100);
  const body = JSON.stringify({ generatedAt: new Date().toISOString(), leaderboard }, null, 2);
  await env.CARD_ASSETS.put("snapshots/leaderboard-latest.json", body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}
