# Plan: Fix Admin Auth + Duplicate Albums + Empty Work Nav

## Context

Two problems after the album-management implementation:

1. **Admin route unprotected**: `/admin` loads without any password prompt. The `_layout.tsx` handler guards GET requests, but something is bypassing it — most likely Fresh's middleware ordering where `app.use()` in `main.ts` runs before `fsRoutes()`, but the handler in `_layout.tsx` may not be intercepting correctly in the current Fresh 2.x version. Needs investigation and a fix to ensure the Basic Auth challenge is always returned.

2. **Duplicate albums + empty Work nav**:
   - The `/admin` page calls `fetchAllAlbums()` (reads Strapi directly), then calls `getPhotosByAlbumSlug()` (reads KV cache). Albums show 0 photos because the `["album-photos"]` cache is empty.
   - The duplicate album entries (e.g. `Loyola`/`loyola`, `Meri2025`/`Meri2025 1 Preview`) are real duplicates **in Strapi itself** — not a code issue.
   - The Work nav (`workLinks`, `workPreviews`) is empty because these are populated once at startup in `main.ts:82-83` from the KV cache via `getAllAlbumSlugs()`. If `refreshAlbumCache` failed at startup (Strapi unreachable), they stay empty for the entire server lifetime.

---

## Step 1: Fix Admin Auth

**File:** `photosite-dana/routes/admin/_layout.tsx`

The handler currently only guards GET. Verify whether Fresh 2.x `_layout.tsx` handlers actually intercept requests before rendering. If not, move auth to a middleware file (`routes/admin/_middleware.ts`) which is the correct Fresh 2.x pattern for route-level middleware.

- Create `routes/admin/_middleware.ts` with the auth check (all methods, not just GET)
- The middleware should return the 401 + `WWW-Authenticate: Basic realm="Admin"` response
- Remove the handler export from `_layout.tsx`, keeping only the layout component

**Files to modify:**
- `photosite-dana/routes/admin/_layout.tsx` — remove handler export
- **New file:** `photosite-dana/routes/admin/_middleware.ts` — add auth middleware

---

## Step 2: Fix Duplicate Albums in Strapi (Programmatic Cleanup)

Add a `POST /api/admin/albums/cleanup` endpoint that identifies and deletes duplicate and unwanted albums directly via the Strapi API. Auth is via `isAdminAuthorized` (Basic Auth), same as other admin endpoints.

**Logic:**

1. Fetch all albums from Strapi via `fetchAllAlbums()`
2. For each album, fetch its photo count via a new `fetchPhotoCountForAlbum(documentId)` function (uses `pagination[pageSize]=1` + reads `meta.pagination.total` — cheap)
3. Group albums by normalized slug (lowercase). For any group with >1 entry, delete all entries with 0 photos; keep the one with photos
4. Delete any album whose title ends with `"Preview"` (case-insensitive), regardless of photo count
5. Return a JSON summary: `{ deleted: [{ documentId, title, reason }], kept: [{ documentId, title, photoCount }] }`

**New function in `album-service.ts`:**
- `deleteAlbum(documentId: string): Promise<void>` — `DELETE ${STRAPI_URL}api/albums/${documentId}`
- `fetchPhotoCountForAlbum(albumDocumentId: string): Promise<number>` — fetches count from `meta.pagination.total`

**New file:** `photosite-dana/routes/api/admin/albums/cleanup.ts`

**Files to modify:**
- `photosite-dana/services/album-service.ts` — add `deleteAlbum` and `fetchPhotoCountForAlbum`
- **New file:** `photosite-dana/routes/api/admin/albums/cleanup.ts` — POST handler

---

## Step 3: Fix Empty Work Nav (Two Sub-Problems)

### 3a: Startup refresh guard ignores the album cache

**Root cause:** The startup check in `main.ts` reads `CacheMetadata` (written only by `saveAllAlbums` / old filename-based cache) to decide whether to call `refreshAlbumCache`. If the old `["albums", *]` cache is populated but `["album", *]` is empty, `metadata.albumCount > 0` evaluates to `true` and `refreshAlbumCache` is skipped — leaving `workLinks` and `workPreviews` empty.

**Fix:** Change the startup condition to also check that the album KV namespace is non-empty. Use `getAllAlbumSlugs(kv)` and require both `albumCount > 0` **and** `slugs.length > 0` before skipping the refresh.

```ts
// BEFORE
const hasValidMetadata = metadata && metadata.albumCount > 0 && metadata.totalImages > 0;

// AFTER
const slugs = await getAllAlbumSlugs(kv);
const hasValidMetadata = metadata && metadata.albumCount > 0 && metadata.totalImages > 0 && slugs.length > 0;
```

### 3b: Work nav computed once at startup

**Root cause:** `workLinks` and `workPreviews` are computed at startup (`main.ts:82-83`) and injected as static values for the entire server lifetime. Even after 3a is fixed, a cache refresh via `/api/cache/refresh` will not update the nav until server restart.

**Fix:** Move the computation inside `app.use()` so it runs per-request from the live cache.

```ts
// BEFORE (static, computed once at startup)
const workLinks = await fetchWorkLinks(kv);
const workPreviews = await fetchWorkPreviews(kv);

app.use(async (ctx) => {
  ctx.state.workLinks = workLinks;
  ctx.state.workPreviews = workPreviews;
  ...
});
```

```ts
// AFTER (computed per-request from live cache)
app.use(async (ctx) => {
  const [workLinks, workPreviews] = await Promise.all([
    fetchWorkLinks(kv),
    fetchWorkPreviews(kv),
  ]);
  ctx.state.workLinks = workLinks;
  ctx.state.workPreviews = workPreviews;
  ...
});
```

**File to modify:** `photosite-dana/main.ts`

---

## Verification

1. **Admin auth**: Navigate to `/admin` in a fresh browser (or incognito). Should see a Basic Auth prompt. Enter wrong password → should fail. Enter correct password → should load.
2. **Duplicate albums**: After Strapi cleanup, reload `/admin` — should show each album only once.
3. **Work nav**: After triggering `POST /api/cache/refresh` (with correct token), reload any page and click "Work" — should show the album list populated.
4. **Photo counts**: After cache refresh, `/admin` should show correct photo counts per album.
