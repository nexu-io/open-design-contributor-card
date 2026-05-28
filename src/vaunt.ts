const API_BASE = "https://api.vaunt.dev/v1";
const PAGE_LIMIT = 100;
const MIN_SIGNAL_SCORE = 10;

export interface VauntContributorScore {
  login: string;
  score: number;
  rank: number;
  totalFetched: number;
}

export interface VauntContributorLookup {
  score: VauntContributorScore | null;
  totalContributors: number;
}

interface VauntContributor {
  name: string;
  type: string;
  contributions: number;
}

interface VauntContributorsResponse {
  data: VauntContributor[];
  next_cursor?: string;
}

function isBotName(login: string): boolean {
  return /\[bot\]$/i.test(login) || /^bot-/i.test(login) || /-bot$/i.test(login) || /dependabot|renovate|copilot|coderabbit/i.test(login);
}

function isBot(contributor: VauntContributor): boolean {
  return contributor.type.toLowerCase() === "bot" || isBotName(contributor.name);
}

export async function fetchVauntContributorLookup(owner: string, repo: string, login: string): Promise<VauntContributorLookup> {
  const target = login.toLowerCase();
  let cursor: string | undefined;
  let rank = 0;
  let match: Omit<VauntContributorScore, "totalFetched"> | null = null;
  const seen = new Set<string>();

  while (true) {
    const url = new URL(`${API_BASE}/github/entities/${owner}/repositories/${repo}/contributors`);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    if (cursor) url.searchParams.set("after", cursor);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Vaunt API failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json<VauntContributorsResponse>();
    const humans = payload.data.filter((contributor) => !isBot(contributor));
    const minHumanScore = humans.length > 0 ? Math.min(...humans.map((contributor) => contributor.contributions)) : 0;

    for (const contributor of humans) {
      const key = contributor.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rank += 1;
      if (key === target) {
        match = { login: contributor.name, score: contributor.contributions, rank };
      }
    }

    if (!payload.next_cursor || payload.next_cursor === cursor) break;
    if (!match && minHumanScore < MIN_SIGNAL_SCORE) break;
    cursor = payload.next_cursor;
  }

  return {
    score: match ? { ...match, totalFetched: seen.size } : null,
    totalContributors: seen.size,
  };
}
