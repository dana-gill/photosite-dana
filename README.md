# photosite-dana

Photo gallery site using Fresh (Deno), Deno KV cache, and Sanity CMS.

**Production URL:** https://photosite-dana.danadeploy.deno.net/

## Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```
deno task dev
```

This will watch the project directory and restart as necessary.

## Categories

Photos are stored in Sanity. Each photo has one `category` (`architecture`,
`couples` or `portraits`) and an `order` number. Photos are cached in Deno KV.
The category list is fixed in code: `types/category.ts` and
`photosite-sanity/schemaTypes/categories.ts` (keep both the same).

To add photos: upload in Sanity Studio or on `/admin/categories/{category}`, set
`category` and `order`, then refresh the cache (see below).

## Routes

- `/` — home page with carousel
- `/architecture`, `/couples`, `/portraits` — photo gallery for each category
- `/about` — About page
- `/work/*` — 301 redirect to `/` (old album links)

### Admin pages (Basic auth: `ADMIN_USERNAME`, `ADMIN_PASSWORD`)

- `/admin` — categories with photo counts
- `/admin/categories/{category}` — upload, reorder and delete photos
- `/admin/carousel` — edit the home page carousel

## Sanity Studio

The Studio is in `photosite-sanity/` and uses npm (not Deno):

```
cd photosite-sanity
npm install
npm run dev              # http://localhost:3333
npx sanity schema deploy # deploy the schema
npx sanity deploy        # hosted Studio (danagill-photosite)
```

You can also run `deno task studio` from the repo root. Schema types: `photo`,
`carousel` and `about` (`carousel` and `about` are singletons).

## Reset content (destructive)

`scripts/reset-sanity-content.ts` deletes all `album` and `photo` documents
(drafts included) and all unreferenced image assets. It never deletes the
`about` document or its image. Export a backup first:
`npx sanity dataset export production backup-<date>.tar.gz`

```
deno run -A --env scripts/reset-sanity-content.ts            # dry run
deno run -A --env scripts/reset-sanity-content.ts --confirm  # delete
```

## Import photos

`scripts/import-photos.ts` uploads local photos to Sanity. It is a dry run by
default (no uploads, no writes).

```
deno run -A --env scripts/import-photos.ts [root=assets]            # dry run
deno run -A --env scripts/import-photos.ts [root=assets] --confirm  # import
```

Folder layout (`assets/` is git-ignored):

- `<root>/{architecture,couples,portraits}/` — `.jpg`, `.jpeg`, `.png` files.
  Natural sort by file name sets `order` (1, 2, 3, ...). Other folders are
  skipped with a warning.
- `<root>/about/` — exactly 1 image. It is set on the `about` singleton (an
  existing `altTitle` is kept). If the folder is missing, `about` is not
  changed.
- `<root>/carousel/` — byte-identical copies of category photos. They are
  matched by SHA-1 and set as the carousel (weak refs, file name order). If any
  file has no matching photo, the carousel is not set and the script exits 1.

Re-runs are safe: a photo is not created twice for the same file in a category.
Images are not resized (Sanity CDN serves resized versions). After the import,
refresh the cache (`POST /api/cache/refresh`).

## API Endpoints

### Public and token

- `GET /api/recent-images` — 10 random photos from all categories
- `POST /api/cache/refresh` — refresh the cache. Needs
  `Authorization: Bearer PHOTOSITE_TOKEN`.

### Admin (Basic auth: `ADMIN_USERNAME`, `ADMIN_PASSWORD`)

- `POST /api/admin/cache/refresh` — refresh the cache
- `POST /api/admin/categories/{category}/photos` — upload a photo (form data:
  `file`, optional `altTitle`, `caption`)
- `DELETE /api/admin/categories/{category}/photos?photoDocumentId=...` — delete
  a photo
- `POST /api/admin/categories/{category}/reorder` — save order, body
  `{ "photoIds": [...] }`
- `POST /api/admin/carousel` — save the carousel

### Refresh Cache (example)

Manually trigger a cache refresh from Sanity:

**Local:**

```bash
curl -X POST http://localhost:5174/api/cache/refresh \
  -H "Authorization: Bearer PHOTOSITE_TOKEN"
```

**Production:**

```bash
curl -X POST https://photosite-dana.danadeploy.deno.net/api/cache/refresh \
  -H "Authorization: Bearer PHOTOSITE_TOKEN"
```

Returns:

```json
{ "success": true, "message": "Cache refreshed successfully" }
```
