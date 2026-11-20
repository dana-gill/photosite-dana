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
