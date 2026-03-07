# Plan: Album Management + Admin Portal

## Context

Currently, albums are derived entirely from filename conventions in Strapi's Media Library
(`sunchasing_01.jpg` → album `sunchasing`, order by numeric suffix). This is fragile — renaming
a file breaks the album, order can't be manually adjusted, and there's no way to manage albums
without going into Strapi's admin UI.

This plan migrates to proper Album + Photo content types in Strapi, adds native ordering,
and builds a `/admin` portal within `photosite-dana` so albums can be managed without touching
Strapi directly.

---

## Decisions

- **Admin location**: Within `photosite-dana` at `/admin` routes
- **Auth**: HTTP Basic Auth — `ADMIN_PASSWORD` env var checked server-side via `isAdminAuthorized(req)`. All Strapi calls use `STRAPI_API_TOKEN`.
- **Data model**: Album + Photo as separate Strapi content types (Photo has `order: integer`,
  `altTitle: string`, `caption: string`, `image: Media`, `album: manyToOne`)

---

## Step 1 — Create Strapi content types via schema files

The `photosite-strapi` repo deploys to Strapi Cloud via git. Strapi reads schema files from `src/api/` on startup and creates content types automatically — no clicking through the admin UI required.

### New files in `photosite-strapi/src/api/`

Each content type needs a schema file plus boilerplate route, controller, and service files using Strapi's core factories.

**`src/api/album/content-types/album/schema.json`**
```json
{
  "kind": "collectionType",
  "collectionName": "albums",
  "info": {
    "singularName": "album",
    "pluralName": "albums",
    "displayName": "Album"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "title": { "type": "string", "required": true },
    "slug": { "type": "uid", "targetField": "title", "required": true },
    "description": { "type": "text" },
    "photos": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::photo.photo",
      "mappedBy": "album"
    }
  }
}
```

**`src/api/photo/content-types/photo/schema.json`**
```json
{
  "kind": "collectionType",
  "collectionName": "photos",
  "info": {
    "singularName": "photo",
    "pluralName": "photos",
    "displayName": "Photo"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "image": { "type": "media", "multiple": false, "required": true, "allowedTypes": ["images"] },
    "caption": { "type": "string" },
    "altTitle": { "type": "string" },
    "order": { "type": "integer", "required": true, "default": 0 },
    "album": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::album.album",
      "inversedBy": "photos"
    }
  }
}
```

Each type also needs `routes/[name].ts`, `controllers/[name].ts`, and `services/[name].ts` using `factories.createCoreRouter/Controller/Service('api::[name].[name]')` — no custom logic, just the factory call.

### Deploy

Commit all 8 files and push to the Strapi Cloud repo. The content types will be created on startup.

### After deployment — still manual in admin

Permissions and users are runtime database data, not code, so these must be set in the Strapi admin UI after deploying:
- **Settings → Users & Permissions → Roles → Public**: enable `find`, `findOne` for `album` and `photo`
- **Settings → Users & Permissions → Roles → Add role**: create "Editor" with full `album`, `photo`, and `upload` permissions
- Create a user with the Editor role for the admin portal login

---

## Step 2 — Write a one-time migration script

### New file: `photosite-dana/scripts/migrate-media-to-albums.ts`

A Deno script that reads from the existing Media Library and creates Album + Photo entries in Strapi.
Run once after Step 1 is complete (content types and Editor user exist).

**Algorithm:**
1. Fetch all files from `GET /api/upload/files?pageSize=100` (paginate if needed)
2. Group files by the filename prefix — same logic as `image-service.ts`:
   - Strip numeric suffix and extension: `sunchasing_01.jpg` → prefix `sunchasing`
   - Files with no `_N` suffix are treated as a single-image album using the full name
3. For each group (album):
   - Derive a title by replacing hyphens/underscores with spaces and title-casing (e.g., `e-and-c` → `E And C`)
   - `POST /api/albums` with `{ title, slug: prefix, description: null }`
   - For each file in the group, sorted by numeric suffix ascending:
     - `POST /api/photos` with `{ image: file.id, order: index, album: album.documentId }`
4. Log each created Album and Photo, and any errors, to stdout
5. On completion, print a summary: X albums created, Y photos linked

**Environment variables needed:** `STRAPI_URL`, `STRAPI_EDITOR_JWT` (the JWT from logging in as the Editor user — not the API token, since we need write access via the Users & Permissions role)

**Run with:**
```sh
STRAPI_URL=https://... STRAPI_EDITOR_JWT=... deno run --allow-net scripts/migrate-media-to-albums.ts
```

---

## Step 3 — Add new Strapi types to the frontend

### New file: `photosite-dana/types/album.ts`


```ts
import type { StrapiImage } from "./strapi.ts";

export interface StrapiAlbum {
  readonly id: number;
  readonly documentId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StrapiPhoto {
  readonly id: number;
  readonly documentId: string;
  readonly altTitle: string | null;
  readonly caption: string | null;
  readonly order: number;
  readonly image: StrapiImage;
  readonly album: StrapiAlbum | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StrapiAlbumResponse {
  readonly data: ReadonlyArray<StrapiAlbum>;
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly pageSize: number;
      readonly pageCount: number;
      readonly total: number;
    };
  };
}

export interface StrapiPhotoResponse {
  readonly data: ReadonlyArray<StrapiPhoto>;
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly pageSize: number;
      readonly pageCount: number;
      readonly total: number;
    };
  };
}
```

---

## Step 4 — Create album service for fetching from new content types

### New file: `photosite-dana/services/album-service.ts`

Functions (alphabetical):
- `fetchAlbumBySlug(slug)` — `GET /api/albums?filters[slug][$eq]={slug}&populate=*`
- `fetchAllAlbums()` — `GET /api/albums?populate=*`
- `fetchPhotosByAlbum(albumDocumentId)` — `GET /api/photos?filters[album][documentId][$eq]={id}&populate=image&sort=order:asc&pagination[pageSize]=100` (Strapi defaults to 25 — set high to avoid silently dropping photos from large albums)

All functions use `STRAPI_API_TOKEN` bearer auth, same pattern as existing `image-service.ts`.

---

## Step 5 — Update cache layer to support Album/Photo model

### Update `photosite-dana/services/cache-manager.ts`

Add two new KV key namespaces:
- `["album-photos", slug]` storing `ReadonlyArray<StrapiPhoto>` (photos for a given album)
- `["album", slug]` storing `StrapiAlbum` (album metadata: title, description, etc.)

New functions to add (alphabetical):
- `clearAlbumCache(kv)` — deletes all `["album-photos", *]` and `["album", *]` entries
- `getAlbumBySlug(kv, slug)` — returns `StrapiAlbum | null`
- `getAllAlbumSlugs(kv)` — lists all cached album slugs from `["album", *]` entries
- `getPhotosByAlbumSlug(kv, slug)` — returns `ReadonlyArray<StrapiPhoto> | null`
- `saveAlbum(kv, slug, album)` — stores album metadata under `["album", slug]`
- `saveAlbumPhotos(kv, slug, photos)` — stores photos for a slug
- `saveAllAlbumPhotos(kv, albumPhotosMap)` — batch saves photos and albums together

### Update `photosite-dana/services/image-service.ts`

Add `refreshAlbumCache(kv)` — fetches all albums, then fetches photos per album, stores both album metadata (via `saveAlbum`) and photos (via `saveAllAlbumPhotos`). Called alongside existing `refreshCache`.

---

## Step 6 — Replace individual work routes with a single dynamic route

### Delete all files in `routes/work/` except any `_layout.tsx` or `index.tsx`

Each album-specific file (`sunchasing.tsx`, `coron.tsx`, etc.) is removed. Album metadata (title, description) now lives in Strapi on the Album entry, not hardcoded in the route.

### New file: `routes/work/[slug].tsx`

The handler reads `ctx.params.slug`, looks up photos via `getPhotosByAlbumSlug(kv, slug)`, and fetches the album metadata (title, description) via `fetchAlbumBySlug(slug)` (direct Strapi call or from a separate KV cache — see Step 5).

If no album is found for the slug, return a 404 response.

Render uses the `StrapiPhoto` shape:
- `photo.image.url` for `src`
- `photo.altTitle ?? photo.caption ?? photo.image.alternativeText` for alt text
- `photo.image.formats` for responsive sizes
- key on `photo.id`
- Album `title` and `description` passed to `<PageHeader>`

### Update `photosite-dana/CLAUDE.md`

Remove the old work page generation template. New instructions: to add a new album, create it in Strapi with the desired slug and description — no code change needed.

---

## Step 7 — Add admin portal auth gate

No JWT/login flow. Auth is handled by a single `ADMIN_PASSWORD` environment variable checked server-side via HTTP Basic Auth.

### New file: `photosite-dana/services/admin-auth-service.ts`

Functions (alphabetical):
- `isAdminAuthorized(req)` — reads the `Authorization` header, decodes Basic auth, compares password to `ADMIN_PASSWORD` env var. Returns `boolean`.

All Strapi API calls in admin routes use the existing `STRAPI_API_TOKEN` bearer auth — no separate auth token needed.

---

## Step 8 — Add admin portal routes

All admin routes call `isAdminAuthorized(req)`. If false, return a 401 response with `WWW-Authenticate: Basic realm="Admin"` header — this triggers the browser's native Basic Auth prompt.

### New file: `photosite-dana/routes/admin/_layout.tsx`

Layout that checks `isAdminAuthorized`. If unauthorized, returns 401. Wraps content in a minimal admin shell UI.

### New file: `photosite-dana/routes/admin/index.tsx`

Dashboard listing all albums from Strapi (fetched fresh, not from cache). Shows album title, slug, photo count. Links to `/admin/albums/[documentId]`.

### New file: `photosite-dana/routes/admin/albums/[documentId].tsx`

Album editor page. On GET: fetches album + its photos sorted by `order`. Renders:
- Editable album title, description fields
- Photo list with current order numbers
- Drag-and-drop reordering via a Preact island (`islands/AlbumPhotoSorter.tsx`)
- Upload new photo form (multipart POST to Strapi `/api/upload` then create Photo entry)
- Delete photo button per photo

### New file: `photosite-dana/islands/AlbumPhotoSorter.tsx`

Client-side island using [SortableJS](https://github.com/SortableJS/Sortable) for drag-and-drop reordering (works well on both desktop and touch/mobile). Import via CDN or ESM. On drop:
1. Recomputes order integers (0, 1, 2…)
2. POSTs new order to `/api/admin/albums/[documentId]/reorder` (new internal API route)
3. Triggers cache refresh

### New file: `photosite-dana/routes/api/admin/albums/[documentId]/reorder.ts`

Internal API endpoint (checks `isAdminAuthorized`, returns 401 if not):
- Receives `{ photos: Array<{ documentId: string, order: number }> }`
- For each photo, `PUT /api/photos/{documentId}` with updated `order` using `STRAPI_API_TOKEN`
- Returns success or error

---

## Step 9 — Update cache refresh to include album photos

### Update `photosite-dana/routes/api/cache/refresh.ts`

After the existing `refreshCache(kv)` call, also call `refreshAlbumCache(kv)` so both old (filename-based) and new (slug-based) caches are populated during the transition period.

### Update `photosite-dana/main.ts`

Add `refreshAlbumCache(kv)` call during startup initialization alongside the existing `refreshCache(kv)` check.

---

## Step 10 — Update work index page, nav links, and work previews

This is a clean cutover — no fallback to old filename-based data. Run the migration script (Step 2) and verify before deploying these changes.

### Update `photosite-dana/main.ts` — rewrite `fetchWorkPreviews`

Currently reads the filesystem to discover work route files and parses `getImagesByAlbum` calls from source code. Replace this entirely:
1. Fetch all albums via `getAllAlbumSlugs(kv)` (from the album cache populated in Step 9)
2. For each slug, read `getPhotosByAlbumSlug(kv, slug)` and take the first photo's medium/small format URL as the preview image
3. Build `WorkPreview` objects with `href: /work/${slug}`

This removes the dependency on individual route files existing on disk.

### Update `photosite-dana/main.ts` — rewrite `fetchWorkLinks`

Currently imports the auto-generated `routes/api/work-links.ts` file. Replace:
1. Fetch all albums from cache (or directly from Strapi via `fetchAllAlbums()`)
2. Map each album to a `NavLink` with `href: /work/${album.slug}` and `label: album.title`
3. Sort alphabetically by label

### Delete `photosite-dana/routes/api/work-links.ts`

No longer needed — work links are derived from album data at startup.

### Delete `photosite-dana/scripts/generate-work-links.ts` (if it exists)

The auto-generation script is no longer needed.

### Update `photosite-dana/utils.ts`

No changes needed to `State` — KV is already there.

---

## Critical files

| File | Change |
|---|---|
| `photosite-strapi/src/api/album/content-types/album/schema.json` | New |
| `photosite-strapi/src/api/album/routes/album.ts` | New |
| `photosite-strapi/src/api/album/controllers/album.ts` | New |
| `photosite-strapi/src/api/album/services/album.ts` | New |
| `photosite-strapi/src/api/photo/content-types/photo/schema.json` | New |
| `photosite-strapi/src/api/photo/routes/photo.ts` | New |
| `photosite-strapi/src/api/photo/controllers/photo.ts` | New |
| `photosite-strapi/src/api/photo/services/photo.ts` | New |
| `photosite-dana/scripts/migrate-media-to-albums.ts` | New — one-time migration script |
| `photosite-dana/types/album.ts` | New |
| `photosite-dana/services/album-service.ts` | New |
| `photosite-dana/services/admin-auth-service.ts` | New — Basic Auth check via ADMIN_PASSWORD |
| `photosite-dana/services/cache-manager.ts` | Add album-photo cache functions |
| `photosite-dana/services/image-service.ts` | Add `refreshAlbumCache` |
| `photosite-dana/routes/work/*.tsx` | Delete all individual album route files |
| `photosite-dana/routes/work/[slug].tsx` | New — single dynamic route for all albums |
| `photosite-dana/routes/admin/_layout.tsx` | New — auth gate |
| `photosite-dana/routes/admin/index.tsx` | New |
| `photosite-dana/routes/admin/albums/[documentId].tsx` | New |
| `photosite-dana/routes/api/admin/albums/[documentId]/reorder.ts` | New |
| `photosite-dana/islands/AlbumPhotoSorter.tsx` | New (uses SortableJS) |
| `photosite-dana/routes/api/cache/refresh.ts` | Add album cache refresh |
| `photosite-dana/routes/api/work-links.ts` | Delete — replaced by album data |
| `photosite-dana/scripts/generate-work-links.ts` | Delete — no longer needed |
| `photosite-dana/main.ts` | Rewrite `fetchWorkPreviews` + `fetchWorkLinks` to use album cache; add album cache init |
| `photosite-dana/CLAUDE.md` | Update work page generation instructions |

---

## Reusable patterns to follow

- Auth check pattern: `routes/api/albums/index.ts:14-29` (bearer token check → 401 response)
- Strapi fetch pattern: `services/image-service.ts:62-99` (fetch + error handling + normalize)
- Cache save pattern: `services/cache-manager.ts:78-98` (KV set + metadata update)
- Work page template: `routes/work/sunchasing.tsx` (handler + page component shape)

---

## Verification

1. **Strapi**: After creating content types, confirm `GET /api/albums` and `GET /api/photos` return data
2. **Migration**: Run the migration script, confirm the summary shows expected album and photo counts, spot-check a few albums in Strapi admin to verify order is correct
2. **Album cache**: Start dev server, check logs show album cache initialized; call `/api/cache/refresh` and confirm both `albumCount` and photo counts in response
3. **Dynamic route**: Visit `/work/sunchasing` — album title, description, and photos should render in correct order. Visit `/work/nonexistent` — confirm 404 response.
4. **Admin auth**: Visit `/admin` — browser should prompt for Basic Auth. Enter any username and the `ADMIN_PASSWORD` value, confirm access granted.
5. **Album list**: `/admin` should list all albums with photo counts
6. **Reorder**: Drag photos in `/admin/albums/[id]`, save, refresh the public work page and confirm new order
7. **Upload**: Upload a new photo via admin, confirm it appears on the public page after cache refresh
8. **Auth gate**: Visit `/admin` in an incognito window — confirm browser shows Basic Auth prompt
9. **Work index**: Visit `/work` — confirm album grid shows all albums with preview images, nav links are correct, and no individual route files are needed
