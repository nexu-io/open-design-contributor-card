import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GitHubAppClient } from "../src/github";

function pkcs1PrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
}

describe("GitHubAppClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts GitHub App RSA private keys exported as PKCS#1", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/access_tokens")) {
        return new Response(JSON.stringify({ token: "installation-token" }), { status: 201 });
      }
      if (url.includes("/search/issues")) {
        return new Response(JSON.stringify({ total_count: 0 }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const client = new GitHubAppClient("123", "456", pkcs1PrivateKey());

    await expect(client.fetchContributorStats("nexu-io", "open-design", "alice")).resolves.toEqual({
      prsMerged: 0,
      reviews: 0,
      issuesOpened: 0,
      commentedThreads: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/app/installations/456/access_tokens",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
