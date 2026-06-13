import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const OUT_DIR = resolve(".tmp", "png-card-backfill");
const BASE_URL = "https://open-design-contributor-card.powerformer.workers.dev";

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
}

async function main(): Promise<void> {
  const files = (await readdir(OUT_DIR)).filter((file) => file.endsWith(".png")).sort();
  const missing: string[] = [];
  const ok: string[] = [];
  await runPool(files, 24, async (file) => {
    const response = await fetch(`${BASE_URL}/cards/${encodeURIComponent(file.replace(/\.png$/, ""))}.png`, {
      method: "HEAD",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.startsWith("image/png")) {
      ok.push(file);
    } else {
      missing.push(file);
    }
  });
  missing.sort();
  ok.sort();
  console.log(`ok=${ok.length} missing=${missing.length}`);
  for (const file of missing) console.log(file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
