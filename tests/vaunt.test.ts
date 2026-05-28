import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVauntContributorLookup } from "../src/vaunt";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchVauntContributorLookup", () => {
  it("continues paging after finding the target so totalContributors is complete", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const after = url.searchParams.get("after");
      const payload = after === "page-2"
        ? {
            data: [
              { name: "carol", type: "User", contributions: 20 },
              { name: "dave", type: "User", contributions: 12 },
            ],
          }
        : {
            data: [
              { name: "alice", type: "User", contributions: 100 },
              { name: "bob", type: "User", contributions: 50 },
            ],
            next_cursor: "page-2",
          };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const lookup = await fetchVauntContributorLookup("nexu-io", "open-design", "bob");

    expect(lookup.score).toMatchObject({ login: "bob", score: 50, rank: 2 });
    expect(lookup.totalContributors).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to an empty lookup when Vaunt is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404, statusText: "Not Found" }));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(fetchVauntContributorLookup("nexu-io", "open-design", "alice")).resolves.toEqual({
      score: null,
      totalContributors: 0,
    });
    expect(warn).toHaveBeenCalledWith("Vaunt API lookup failed", {
      owner: "nexu-io",
      repo: "open-design",
      status: 404,
      statusText: "Not Found",
    });
  });
});
