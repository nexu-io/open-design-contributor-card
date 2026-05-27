import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface ContributorEntry {
  username: string;
  avatarUrl: string | null;
  points: number;
  tier: string;
  prsMerged: number;
  reviews: number;
  discussionsAnswered: number;
  issuesAccepted: number;
  streakWeeks: number;
  lastActiveAt: string;
  founding: boolean;
  tierHistory: Array<{ tier: string; reachedAt: string }>;
}

interface ContributorsFile {
  generatedAt: string;
  totalContributors: number;
  contributors: Record<string, ContributorEntry>;
}

interface EventLine {
  ts: string;
  type: string;
  user: string;
  issue?: number;
  pr?: number;
  delta?: number;
  promoted?: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const SOURCE_ROOT = resolve(PROJECT_ROOT, "..", "open-design", "data");
const OUTPUT_DIR = resolve(PROJECT_ROOT, ".tmp", "backfill");
const OUTPUT_FILE = resolve(OUTPUT_DIR, "open-design-data.sql");

function quoteText(value: string | null | undefined): string {
  if (value == null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "NULL";
  return String(Math.trunc(value));
}

function buildContributorRows(file: ContributorsFile, importedAt: string): string[] {
  const generatedAt = file.generatedAt;
  const rows: string[] = [];
  for (const [, entry] of Object.entries(file.contributors)) {
    const login = entry.username.toLowerCase();
    const lastCheckedAt = entry.lastActiveAt;
    const lastAnnouncedAt: string | null =
      entry.tierHistory.length > 0 ? entry.tierHistory[entry.tierHistory.length - 1].reachedAt : null;
    rows.push(
      `INSERT INTO contributors (` +
        `login, avatar_url, last_announced_tier, last_known_score, last_checked_at, last_announced_at, ` +
        `score_version, last_rank, last_total_contributors, last_vaunt_score, last_weighted_score, last_reason, ` +
        `created_at, updated_at, ` +
        `prs_merged, reviews, issues_accepted, discussions_answered, streak_weeks, last_active_at, founding, ` +
        `tier_history_json, profile_generated_at` +
        `) VALUES (` +
        `${quoteText(login)}, ${quoteText(entry.avatarUrl)}, ${quoteText(entry.tier)}, ${quoteInt(entry.points)}, ` +
        `${quoteText(lastCheckedAt)}, ${lastAnnouncedAt ? quoteText(lastAnnouncedAt) : "NULL"}, ` +
        `${quoteText("legacy-import-1")}, 0, ${quoteInt(file.totalContributors)}, NULL, ${quoteInt(entry.points)}, ` +
        `${quoteText("Backfilled from open-design/data/contributors.json")}, ` +
        `${quoteText(importedAt)}, ${quoteText(importedAt)}, ` +
        `${quoteInt(entry.prsMerged)}, ${quoteInt(entry.reviews)}, ${quoteInt(entry.issuesAccepted)}, ` +
        `${quoteInt(entry.discussionsAnswered)}, ${quoteInt(entry.streakWeeks)}, ` +
        `${quoteText(entry.lastActiveAt)}, ${entry.founding ? 1 : 0}, ` +
        `${quoteText(JSON.stringify(entry.tierHistory))}, ${quoteText(generatedAt)}` +
        `) ON CONFLICT(login) DO UPDATE SET ` +
        `avatar_url = excluded.avatar_url, ` +
        `last_announced_tier = excluded.last_announced_tier, ` +
        `last_known_score = excluded.last_known_score, ` +
        `last_checked_at = excluded.last_checked_at, ` +
        `last_announced_at = excluded.last_announced_at, ` +
        `score_version = excluded.score_version, ` +
        `last_total_contributors = excluded.last_total_contributors, ` +
        `last_weighted_score = excluded.last_weighted_score, ` +
        `last_reason = excluded.last_reason, ` +
        `updated_at = excluded.updated_at, ` +
        `prs_merged = excluded.prs_merged, ` +
        `reviews = excluded.reviews, ` +
        `issues_accepted = excluded.issues_accepted, ` +
        `discussions_answered = excluded.discussions_answered, ` +
        `streak_weeks = excluded.streak_weeks, ` +
        `last_active_at = excluded.last_active_at, ` +
        `founding = excluded.founding, ` +
        `tier_history_json = excluded.tier_history_json, ` +
        `profile_generated_at = excluded.profile_generated_at` +
        `;`,
    );
  }
  return rows;
}

function buildEventRows(lines: string[], importedAt: string): string[] {
  const rows: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const event = JSON.parse(line) as EventLine;
    rows.push(
      `INSERT INTO legacy_events (ts, type, user_login, issue_number, pr_number, delta, promoted_tier, raw_json, imported_at) VALUES (` +
        `${quoteText(event.ts)}, ${quoteText(event.type)}, ${quoteText(event.user.toLowerCase())}, ` +
        `${quoteInt(event.issue ?? null)}, ${quoteInt(event.pr ?? null)}, ${quoteInt(event.delta ?? 0)}, ` +
        `${quoteText(event.promoted ?? null)}, ${quoteText(line)}, ${quoteText(importedAt)}` +
        `);`,
    );
  }
  return rows;
}

function main(): void {
  const importedAt = new Date().toISOString();
  const contributors = JSON.parse(
    readFileSync(resolve(SOURCE_ROOT, "contributors.json"), "utf8"),
  ) as ContributorsFile;
  const eventLines = readFileSync(resolve(SOURCE_ROOT, "events.jsonl"), "utf8").split(/\n/);
  const sqlLines: string[] = [
    `-- Backfill generated at ${importedAt} from ${resolve(SOURCE_ROOT)}`,
    `-- contributors source generatedAt: ${contributors.generatedAt}`,
    `-- contributor entries: ${Object.keys(contributors.contributors).length}`,
    `-- event lines (raw): ${eventLines.filter((line) => line.trim().length > 0).length}`,
    "DELETE FROM legacy_events;",
    ...buildContributorRows(contributors, importedAt),
    ...buildEventRows(eventLines, importedAt),
    "",
  ];
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, sqlLines.join("\n"));
  process.stdout.write(`${OUTPUT_FILE}\n`);
}

main();
