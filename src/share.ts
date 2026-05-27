import type { CardModel } from "./types";

export function trackedShareUrl(publicBaseUrl: string, eventId: string): string {
  return `${publicBaseUrl.replace(/\/$/, "")}/share/${encodeURIComponent(eventId)}`;
}

export function repoCampaignUrl(repoUrl: string, eventId: string): string {
  const url = new URL(repoUrl);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "contributor_card");
  url.searchParams.set("utm_campaign", "oss_recognition");
  url.searchParams.set("utm_content", eventId);
  return url.toString();
}

export function trackedShareOutUrl(publicBaseUrl: string, destinationUrl: string, eventId: string, lang: "en" | "cn"): string {
  const base = `${publicBaseUrl.replace(/\/$/, "")}/share-out/${encodeURIComponent(eventId)}`;
  const params = new URLSearchParams({ to: destinationUrl, lang });
  return `${base}?${params.toString()}`;
}

function fuzzyContributorCount(total: number): string {
  if (total < 50) return `${total}`;
  return `${Math.max(10, Math.round(total / 10) * 10)}+`;
}

export function xShareUrl(publicBaseUrl: string, repoUrl: string, card: CardModel, lang: "en" | "cn", eventId: string): string {
  const contributorCount = fuzzyContributorCount(card.totalContributors);
  const shareUrl = trackedShareUrl(publicBaseUrl, eventId);
  const text = lang === "cn"
    ? `Open Design 是 Claude Design 的开源、本地优先替代品，用你已有的 coding-agent CLI 把 prompt 变成可交付的设计产物。\n\n在 ${contributorCount} Open Design 贡献者中排名 #${card.rank}。\n\n很开心参与这个开源项目，一起把产品做得更好。\n\n#OpenDesign · ${shareUrl}`
    : `Open Design is the open-source, local-first alternative to Claude Design, turning prompts into design artifacts with the coding-agent CLI you already use.\n\nRanked #${card.rank} among ${contributorCount} Open Design contributors.\n\nGlad to be building in the open.\n\n${shareUrl}`;
  const intentUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({ text }).toString()}`;
  return trackedShareOutUrl(publicBaseUrl, intentUrl, eventId, lang);
}
