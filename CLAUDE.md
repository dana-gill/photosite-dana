# Photosite Project Instructions

## Adding a New Album

Albums are managed in Sanity Studio — no code changes are needed to add a new work page.

To add a new album:
1. Open Sanity Studio at `photosite-sanity/` (run `deno task dev` from there, or use the hosted Studio)
2. Create a new **Album** document with the desired `title`, `slug`, and `description`
3. Create **Photo** documents linked to that album, each with an `image`, `order`, and optional `altTitle`/`caption`
4. Trigger a cache refresh via `POST /api/admin/cache/refresh` (or restart the server)

The album will automatically appear at `/work/{slug}` once the cache is populated.

## Environment Variables

Replace any Strapi vars with:
- `SANITY_PROJECT_ID` — Sanity project ID (`serh8kfd`)
- `SANITY_DATASET` — dataset name (default: `production`)
- `SANITY_API_TOKEN` — Sanity API token with write access

## Sanity Studio

The Studio lives at `photosite-sanity/`. Install with `npm install` and run with `npm run dev`.
Schema types: `album`, `photo`, `carousel` (singleton).
