# open-design-contributor-card

Cloudflare Worker project that owns Open Design contributor-card maintenance.

## What moved here

- contributor score calculation
- tier progression
- contributor state persistence
- card asset storage
- GitHub comment posting
- share/share-out tracking

The Open Design repo keeps a thin GitHub Actions relay only.

## Architecture

- **Worker**: receives GitHub event relays, computes score/tier, stores state, posts comments, serves assets and share redirects
- **D1**: contributor state, card events, ingestion log, share click log
- **R2**: generated contributor card SVG assets and daily leaderboard snapshot

## Required secrets

Set these with `wrangler secret put`:

- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `WORKFLOW_WEBHOOK_SECRET`

## Setup

```bash
pnpm install
pnpm typegen
```

Create infrastructure:

```bash
wrangler d1 create open-design-contributor-card
wrangler r2 bucket create open-design-contributor-card-assets
```

Then update `wrangler.jsonc` with the real D1 database id and preview names.

Apply migrations:

```bash
wrangler d1 migrations apply open-design-contributor-card --local
wrangler d1 migrations apply open-design-contributor-card --remote
```

Run locally:

```bash
cp .dev.vars.example .dev.vars
pnpm dev
```

## Open Design workflow contract

The relay workflow POSTs JSON to `POST /api/github/events`:

```json
{
  "repository": "nexu-io/open-design",
  "eventName": "pull_request_target",
  "action": "closed",
  "deliveryId": "1234567890-1",
  "triggeredAt": "2026-05-27T10:00:00.000Z",
  "payload": { "...": "original GitHub event payload" }
}
```

The workflow signs the raw body with `WORKFLOW_WEBHOOK_SECRET` using `sha256=<hex>` in `X-Open-Design-Signature`.

## Validation

```bash
pnpm typegen
pnpm typecheck
pnpm test
pnpm check
```
