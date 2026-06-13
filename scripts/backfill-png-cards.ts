import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { renderContributorCard } from "../src/card";
import { topPercent } from "../src/rank";
import type { CardModel, TierKey } from "../src/types";

const execFileAsync = promisify(execFile);
const DB_NAME = "open-design-contributor-card";
const BUCKET_NAME = "open-design-contributor-card-assets";
const OUT_DIR = resolve(".tmp", "png-card-backfill");

interface D1Result<T> {
  results: T[];
  success: boolean;
}

interface CardBackfillRow {
  event_id: string;
  recipient_login: string;
  tier_key: TierKey;
  tier_name: string;
  points: number;
  rank: number;
  total_contributors: number;
  avatar_url: string | null;
  prs_merged: number | null;
  reviews: number | null;
  issues_accepted: number | null;
  discussions_answered: number | null;
  streak_weeks: number | null;
}

interface RenderedCard {
  row: CardBackfillRow;
  file: string;
  key: string;
  bytes: number;
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

async function wranglerJson<T>(args: string[]): Promise<T> {
  const { stdout } = await execFileAsync("pnpm", ["exec", "wrangler", ...args], {
    maxBuffer: 1024 * 1024 * 10,
  });
  return JSON.parse(stdout) as T;
}

async function wrangler(args: string[]): Promise<void> {
  await execFileAsync("pnpm", ["exec", "wrangler", ...args], {
    maxBuffer: 1024 * 1024 * 10,
  });
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
}

async function fetchRows(limit: number | null, eventId: string | null): Promise<CardBackfillRow[]> {
  const where = eventId
    ? `ce.event_id = '${eventId.replaceAll("'", "''")}'`
    : `ce.card_object_key LIKE '%.svg'`;
  const limitClause = limit == null ? "" : `LIMIT ${Math.max(1, Math.trunc(limit))}`;
  const sql = `
    SELECT
      ce.event_id,
      ce.recipient_login,
      ce.tier_key,
      ce.tier_name,
      ce.points,
      ce.rank,
      ce.total_contributors,
      c.avatar_url,
      c.prs_merged,
      c.reviews,
      c.issues_accepted,
      c.discussions_answered,
      c.streak_weeks
    FROM card_events ce
    LEFT JOIN contributors c ON c.login = ce.recipient_login
    WHERE ${where}
    ORDER BY ce.created_at ASC
    ${limitClause};
  `;
  const payload = await wranglerJson<Array<D1Result<CardBackfillRow>>>([
    "d1",
    "execute",
    DB_NAME,
    "--remote",
    "--json",
    "--command",
    sql,
  ]);
  const result = payload[0];
  if (!result?.success) throw new Error("D1 query failed");
  return result.results;
}

function toCardModel(row: CardBackfillRow): CardModel {
  return {
    username: row.recipient_login,
    avatarUrl: row.avatar_url ?? `https://github.com/${row.recipient_login}.png`,
    rank: row.rank,
    totalContributors: row.total_contributors,
    topPercent: topPercent(row.rank, row.total_contributors),
    points: row.points,
    tierKey: row.tier_key,
    tierName: row.tier_name,
    streakWeeks: row.streak_weeks ?? 0,
    prsMerged: row.prs_merged ?? 0,
    reviews: row.reviews ?? 0,
    issuesOpened: row.issues_accepted ?? 0,
    commentedThreads: row.discussions_answered ?? 0,
  };
}

async function main(): Promise<void> {
  const write = hasArg("--write");
  const eventId = argValue("--event-id");
  const limitValue = argValue("--limit");
  const concurrencyValue = Number(argValue("--upload-concurrency") ?? 8);
  const uploadConcurrency = Number.isFinite(concurrencyValue)
    ? Math.max(1, Math.trunc(concurrencyValue))
    : 8;
  const limit = limitValue == null ? null : Number(limitValue);
  const rows = await fetchRows(Number.isFinite(limit) ? limit : null, eventId);

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`${write ? "write" : "dry-run"} rows=${rows.length}`);

  const rendered: RenderedCard[] = [];
  for (const [index, row] of rows.entries()) {
    const png = await renderContributorCard(toCardModel(row));
    const file = resolve(OUT_DIR, `${row.event_id}.png`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, png);
    const key = `cards/${row.event_id}.png`;
    rendered.push({ row, file, key, bytes: png.length });
    console.log(`${index + 1}/${rows.length} rendered ${key} bytes=${png.length}`);
  }

  if (write) {
    console.log(`uploading rows=${rendered.length} concurrency=${uploadConcurrency}`);
    await runPool(rendered, uploadConcurrency, async (item, index) => {
      await wrangler([
        "r2",
        "object",
        "put",
        `${BUCKET_NAME}/${item.key}`,
        "--remote",
        "--file",
        item.file,
        "--content-type",
        "image/png",
        "--cache-control",
        "public, max-age=31536000, immutable",
        "--force",
      ]);
      console.log(`${index + 1}/${rendered.length} uploaded ${item.key} bytes=${item.bytes}`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
