export function fuzzyContributorCount(total: number): string {
  const count = Math.max(0, Math.floor(total));
  if (count >= 100) {
    return `${Math.floor(count / 100) * 100}+`;
  }
  return count.toLocaleString();
}

export function rankSummary(rank: number, totalContributors: number): string {
  return `Rank #${rank.toLocaleString()} among ${fuzzyContributorCount(totalContributors)} contributors`;
}

export function topPercent(rank: number, totalContributors: number): number {
  const rawTopPercent = (rank / Math.max(1, totalContributors)) * 100;
  return Math.min(99, rawTopPercent);
}

export function localRankFromScores(
  scores: Array<{ login: string; score: number }>,
  targetLogin: string,
  targetScore: number,
): { rank: number; totalContributors: number } {
  const target = targetLogin.toLowerCase();
  const deduped = new Map<string, number>();

  for (const entry of scores) {
    deduped.set(entry.login.toLowerCase(), entry.score);
  }
  deduped.set(target, targetScore);

  const sorted = [...deduped.entries()]
    .map(([login, score]) => ({ login, score }))
    .sort((a, b) => b.score - a.score || a.login.localeCompare(b.login));

  const index = sorted.findIndex((entry) => entry.login === target);
  return {
    rank: index >= 0 ? index + 1 : sorted.length,
    totalContributors: sorted.length,
  };
}
