# Photosite Project Instructions

## Adding Photos to a Category

Photos belong to one fixed category: `architecture`, `couples` or `portraits`.

1. Upload the photo in Sanity Studio (`photosite-sanity/`) or on
   `/admin/categories/{category}`
2. Set `category` and `order` (the admin page sets both for you)
3. Refresh the cache with `POST /api/admin/cache/refresh` (admin auth) or
   `POST /api/cache/refresh`

Pages live at `/architecture`, `/couples` and `/portraits`.

Adding a new category needs a code change in both `types/category.ts` and
`photosite-sanity/schemaTypes/categories.ts`.

## Environment Variables

- `SANITY_PROJECT_ID` — Sanity project ID (`serh8kfd`)
- `SANITY_DATASET` — dataset name (default: `production`)
- `SANITY_API_TOKEN` — Sanity API token with write access

## Sanity Studio

The Studio lives in `photosite-sanity/` in this repo. It uses npm, not Deno.

- Install: `npm install`
- Run: `npm run dev` (http://localhost:3333), or `deno task studio` from the
  repo root
- Deploy schema: `npx sanity schema deploy`
- Deploy Studio: `npx sanity deploy` (studioHost `danagill-photosite`)

Schema types: `photo`, `carousel`, `about`. `carousel` and `about` are
singletons.

Rule: keep `photosite-sanity/schemaTypes/categories.ts` the same as
`types/category.ts`.
