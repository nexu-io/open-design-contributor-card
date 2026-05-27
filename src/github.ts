import { importPKCS8, SignJWT } from "jose";
import type { ContributorStats } from "./types";

interface GitHubIssueCommentResponse {
  html_url: string;
  created_at: string;
}

export class GitHubAppClient {
  private tokenPromise: Promise<string> | null = null;

  constructor(
    private readonly appId: string,
    private readonly installationId: string,
    private readonly privateKeyPem: string,
  ) {}

  async fetchContributorStats(owner: string, repo: string, login: string): Promise<ContributorStats> {
    const base = `repo:${owner}/${repo}`;
    const [prsMerged, reviews, issuesOpened, commentedThreads] = await Promise.all([
      this.searchCount(`${base} is:pr is:merged author:${login}`),
      this.searchCount(`${base} is:pr reviewed-by:${login}`),
      this.searchCount(`${base} is:issue author:${login}`),
      this.searchCount(`${base} commenter:${login}`),
    ]);
    return { prsMerged, reviews, issuesOpened, commentedThreads };
  }

  async postIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<GitHubIssueCommentResponse> {
    return this.api<GitHubIssueCommentResponse>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  private async searchCount(query: string): Promise<number> {
    const response = await this.api<{ total_count: number }>(`/search/issues?q=${encodeURIComponent(query)}&per_page=1`);
    return response.total_count;
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getInstallationToken();
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "open-design-contributor-card",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${path} failed: ${response.status} ${body}`);
    }
    return response.json<T>();
  }

  private async getInstallationToken(): Promise<string> {
    if (!this.tokenPromise) {
      this.tokenPromise = this.createInstallationToken();
    }
    return this.tokenPromise;
  }

  private async createInstallationToken(): Promise<string> {
    const jwt = await this.createAppJwt();
    const response = await fetch(`https://api.github.com/app/installations/${this.installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "User-Agent": "open-design-contributor-card",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub installation token failed: ${response.status} ${body}`);
    }
    const payload = await response.json<{ token: string }>();
    return payload.token;
  }

  private async createAppJwt(): Promise<string> {
    const normalizedKey = this.privateKeyPem.replace(/\\n/g, "\n");
    const key = await importPKCS8(normalizedKey, "RS256");
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuedAt(now - 60)
      .setExpirationTime(now + 9 * 60)
      .setIssuer(this.appId)
      .sign(key);
  }
}
