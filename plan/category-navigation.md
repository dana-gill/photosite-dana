# Category Navigation (Architecture / Couples / Portraits)

## Context
The navbar has a "Work" button. It opens a modal (`WorkModal` / `WorkModalMobile`) that lists every Sanity `album`, and each album has a page at `/work/{slug}`.

The new structure removes albums. The navbar shows three fixed categories:

1. Architecture → `/architecture`
2. Couples → `/couples`
3. Portraits → `/portraits`

Each category page is a flat, ordered gallery of photos.

## Decisions
- **Flat gallery:** A category page shows all photos in that category in one grid. There are no sub-albums.
- **One category per photo:** Each photo has exactly one `category` value.
- **Fixed category list:** The categories are a fixed list in code and in the Sanity schema, not Sanity documents. A new category needs a code change. This is acceptable for three stable categories.
- **Order:** The existing `order` number field stays. It now gives the order inside a category. You set the order with drag and drop on the admin category page (Step 11) or by editing the number in Studio.
- **Carousel:** The `carousel` singleton stays and still references `photo` documents. It is set again after the reset. The references become weak, admin saves go to Sanity, and the home page has a fallback (Step 12).
- **Existing content:** All `album` and `photo` documents are deleted and the photos are uploaded again with a category (Step 14). Step 14 also gives an option to retag the existing photos instead.

## Data Model

### Sanity schema (after)
- **photo**: `image` (image, hotspot, required), `category` (string, required, options list `architecture` | `couples` | `portraits`, radio layout), `order` (number, required), `altTitle` (string), `caption` (string)
- **carousel**: no change (singleton, `images[]` → reference to `photo`)
- **album**: removed

### KV cache (after)
| Key | Value |
|---|---|
| `["category-photos", <category>]` | `ReadonlyArray<SanityPhoto>`, sorted by `order` |
| `["carousel"]` | no change |

The `["album", slug]` and `["album-photos", slug]` keys are removed.

---

## Steps

Each step is one commit. Do the steps in order.

### Step 1 — Update the Sanity Studio schema
**Project:** `photosite-sanity/` (a separate project, not in this repo)

- Add the `category` field to the `photo` schema, with the options list and `validation: (r) => r.required()`.
- Remove the `album` reference field from `photo`.
- Remove the `album` document type and take it out of the schema index.
- In the desk structure, add one list for each category (filter `_type == "photo" && category == "<value>"`, ordered by `order asc`). This makes retagging and review easy.
- Deploy the schema (`npx sanity schema deploy` or deploy the hosted Studio).

### Step 2 — Add the category constants and type
**File:** `types/category.ts` (new)

```ts
export const CATEGORIES = ["architecture", "couples", "portraits"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  architecture: "Architecture",
  couples: "Couples",
  portraits: "Portraits",
};

export const isCategory = (value: string): value is Category =>
  CATEGORIES.some((category) => category === value);
```

`as const` is a const assertion, not a type cast. If the lint rules do not allow it, write the union type by hand and give `CATEGORIES` the type `ReadonlyArray<Category>`.

### Step 3 — Update the Sanity types
**File:** `types/sanity.ts`

- Remove `SanityAlbum`.
- In `SanityPhoto`, replace `album: { _ref } | null` with `category: Category`.

### Step 4 — Replace the album queries with category queries
**File:** `services/album-service.ts` → rename to `services/photo-service.ts`

- Remove `createAlbum`, `updateAlbum`, `deleteAlbum`, `fetchAlbumBySlug`, `fetchAllAlbums`, `fetchPhotosByAlbum`.
- Add `fetchPhotosByCategory(category)`:
  `*[_type == "photo" && category == $category] | order(order asc){ _id, ${IMAGE_PROJECTION}, altTitle, caption, order, category }`
- Change `createPhoto` so it takes `category` and not an album id. Set `order` to the current max order in that category plus 1.
- Keep `deletePhoto`, `fetchPhotoById`, `fetchCarouselPhotoIds`, `updatePhotoOrder`, `uploadMediaFile`. Update their projections to `category`.
- Update all imports.

### Step 5 — Update the cache manager
**File:** `services/cache-manager.ts`

- Remove `clearAlbumCache`, `getAlbumBySlug`, `getAllAlbumSlugs`, `getPhotosByAlbumSlug`, `saveAlbum`, `saveAlbumPhotos`, `saveAllAlbumPhotos`.
- Add:
  - `clearCategoryCache(kv)`: deletes the prefixes `["category-photos"]`, `["album"]` and `["album-photos"]` (the last two clear old keys once).
  - `getPhotosByCategory(kv, category): Promise<ReadonlyArray<SanityPhoto>>`: returns `[]` if the key is missing.
  - `saveCategoryPhotos(kv, category, photos)`.

### Step 6 — Update the cache refresh
**Files:** `services/image-service.ts`, `routes/api/cache/refresh.ts`, `routes/api/admin/cache/refresh.ts`, `main.ts`

- `refreshAlbumCache` → `refreshCategoryCache`: fetch `CATEGORIES.map(fetchPhotosByCategory)` and the carousel ids in parallel, then save each category and the carousel.
- The refresh routes call `clearCategoryCache` and `refreshCategoryCache`.
- `main.ts` startup check: warm the cache when all three category keys are empty.

### Step 7 — Add the category page route
**File:** `routes/[category].tsx` (new)

- Handler: if `isCategory(ctx.params.category)` is false, return 404 (early return). If it is true, load `getPhotosByCategory`.
- Page: use the same grid markup as the current `routes/work/[slug].tsx` (`PageHeader` with `CATEGORY_LABELS[category]`, an `Image` grid, and the "No images found" empty state).
- Fresh matches static routes first, so `/about` and `/admin` are not affected.

### Step 8 — Replace the Work modal with category links in the navbar
**Files:** `islands/Nav.tsx`, `islands/consts.ts`, `routes/_app.tsx`, `utils.ts`, `main.ts`

- There is no "Work" item. The navbar shows: site title (left), then Architecture, Couples, Portraits, About (right). The category links are plain links, with no dropdown or modal.
- `islands/consts.ts`: `NAV_LINKS` = the three category links in `CATEGORIES` order (from `CATEGORIES` + `CATEGORY_LABELS`), then About.
- `Nav.tsx`: remove the Work button, the modal state, the screen-size effect, and the `workLinks`/`workPreviews` props. Show `NAV_LINKS` only. On mobile, check that four links fit. If they do not, add a simple menu toggle.
- `_app.tsx`: render `<Nav />` with no props.
- `main.ts`: remove `fetchWorkLinks`, `fetchWorkPreviews` and the per-request KV reads in the middleware. Keep `ctx.state.kv`.
- `utils.ts`: remove `WorkPreview`, `workLinks` and `workPreviews` from `State`.

### Step 9 — Remove the old work code
- Delete `routes/work/[slug].tsx`, `islands/WorkModal.tsx`, `islands/WorkModalMobile.tsx`, `routes/api/work-previews.ts`.
- `routes/api/albums/index.ts` and `routes/api/albums/[album].ts`: replace them with `routes/api/categories/index.ts` and `routes/api/categories/[category].ts` (same token auth, category summaries). If no client uses them, delete them.
- `routes/api/recent-images.ts` and `routes/index.tsx`: read photos from all categories (`CATEGORIES.map(getPhotosByCategory)`), not from album slugs.
- Add a redirect so old links work: `routes/work/[...path].tsx` returns `301` to `/`. Alternatively, map known old album slugs to a category.

### Step 10 — Change the admin from albums to categories
**Files:**
- `routes/admin/index.tsx`: list the three categories with photo counts and links to `/admin/categories/{category}`. Remove `CreateAlbumForm` and `DeleteAlbumButton`.
- `routes/admin/albums/[documentId].tsx` → `routes/admin/categories/[category].tsx`: reuse `AlbumPhotoSorter` (rename it to `PhotoSorter`) and `PhotoUploader`.
- `routes/api/admin/albums/**` → `routes/api/admin/categories/[category]/photos.ts` and `reorder.ts`. Each validates the category with `isCategory` and returns 400 early if it is not valid.
- `islands/PhotoUploader.tsx`: post to the new category endpoint.
- Delete `islands/CreateAlbumForm.tsx`, `islands/DeleteAlbumButton.tsx`, `islands/EditAlbumFields.tsx`.
- `routes/admin/carousel.tsx`: build the photo library from `fetchPhotosByCategory` for each category, not from albums.

### Step 11 — Photo order within a category
**Files:** `islands/PhotoSorter.tsx`, `routes/api/admin/categories/[category]/reorder.ts`, `services/photo-service.ts`, `routes/admin/categories/[category].tsx`

The admin category page is the main place to set the order.

- **Drag and drop:** `PhotoSorter` shows the photos of one category in their current order (Sortable.js, same as `AlbumPhotoSorter`). Drag a photo to move it, then click "Save order".
- **Move buttons:** Each photo also has "Move to top" and "Move to bottom" buttons. These help with long lists, where dragging is slow, and on touch screens.
- **Position numbers:** Each photo shows its position (1, 2, 3, …) so you can see the order before you save.
- **Save request:** `POST /api/admin/categories/{category}/reorder` with the body `{ photoIds: ReadonlyArray<string> }`. The array order is the display order. The client does not send order numbers.
- **Server:**
  1. Check admin auth. If it fails, return 401.
  2. If `isCategory` is false, return 400.
  3. Parse the body with a type guard (`isReorderBody`). If the body is not valid, return 400. Do not assign the JSON to a type without a check.
  4. Fetch the current photo ids for the category. If the sets are different (missing, extra or duplicate ids), return 409 with "Reload the page".
  5. Write `order = index + 1` for each photo in one Sanity transaction (`client.transaction()`), not in separate patches. If one write fails, all writes fail and the order stays clean.
  6. Refresh only that category in KV (`saveCategoryPhotos`), then return `{ success: true }`.
- **New uploads:** These go to the end of the category (max `order` + 1, see Step 4).
- **Deletes:** Leave gaps in the numbers. Gaps do not change the sort. The next save renumbers the photos 1..n.
- **Studio:** You can also edit the `order` number directly in Studio. Then refresh the cache (`POST /api/admin/cache/refresh`). The Step 1 desk lists sort by `order`, so the Studio shows the same order as the site.
- **Optional:** For drag and drop in Studio too, add `@sanity/orderable-document-list` to `photosite-sanity/`. This plugin uses its own `orderRank` field. Choose only one of `order` or `orderRank` as the source of truth. Do not use both. This plan uses `order`.

### Step 12 — Rebuild the home page carousel
**Files:** `photosite-sanity/` carousel schema, `routes/api/admin/carousel/index.ts`, `islands/CarouselEditor.tsx`, `routes/admin/carousel.tsx`, `routes/index.tsx`, `services/photo-service.ts`

After the reset, most photos in the current carousel will not exist. The carousel must be set again from the new category photos, and it must not break when a photo is deleted.

- **Bug to fix first:** `POST /api/admin/carousel` writes only to KV, not to Sanity. The next cache refresh reads the old Sanity `carousel` doc, so admin carousel changes are lost. Change the route to:
  1. Write to Sanity: `client.createOrReplace({ _id: "carousel", _type: "carousel", images: [...] })`. Each image is `{ _key, _type: "reference", _ref: photoId, _weak: true }`.
  2. Then write the same entries to KV.
  3. Parse the body with a type guard (`isSaveCarouselBody`). If the body is not valid, return 400.
  4. If a photo id does not exist in Sanity, return 400.
- **Weak references:** In the Studio schema, set `weak: true` on the `images[]` reference. A photo that is in the carousel can then be deleted. Without this, Sanity refuses the delete.
- **Photo delete:** When a photo is deleted (admin or script), remove its ref from `carousel.images` in the same transaction. Then refresh the carousel in KV.
- **Editor library:** `CarouselEditor` shows the photo library grouped by category, with Architecture / Couples / Portraits filter tabs. Each thumbnail shows its category. Keep paging (`CAROUSEL_LIBRARY_PAGE_SIZE`).
- **Home page:**
  - Build the photo map from `CATEGORIES.map(getPhotosByCategory)`, not from album slugs.
  - Skip carousel entries that do not match a photo. The current filter already does this.
  - **Fallback:** If no valid carousel photos remain, show the first photo of each category in order. The home page is then never empty after the reset.
  - If there are no photos at all, show no carousel and no error.
- **Admin warning:** On `/admin/carousel`, show "N carousel photos no longer exist" with a "Remove missing" button. This cleans old refs in one click.

### Step 13 — Update the documentation
**Files:** `CLAUDE.md`, `README.md`

- Replace the "Adding a New Album" section with "Adding Photos to a Category". Steps: upload in Studio or `/admin`, set the category and order, then refresh the cache.
- Schema types: `photo`, `carousel`.

### Step 14 — Reset the Sanity content (destructive)
**File:** `scripts/reset-sanity-content.ts` (new)

**Warning:** This step permanently deletes content in the `production` dataset. Before you run it, export a backup:
`npx sanity dataset export production backup-<date>.tar.gz`

The script:
- Runs in dry-run mode by default. It prints the counts of `album` docs, `photo` docs and carousel refs.
- With `--confirm`, it:
  1. Unsets `carousel.images`. Sanity does not delete a document that is still referenced.
  2. Deletes all `photo` documents.
  3. Deletes all `album` documents.
  4. Optionally (`--purge-assets`) deletes `sanity.imageAsset` docs that nothing references.
- Uses one transaction for each batch of 100 IDs.

**Option without re-upload:** Do not delete the photos. Set `category` on each existing photo in the Studio category lists (Step 1), then delete only the `album` docs and unset `photo.album`. This keeps the uploaded assets and the carousel refs.

### Step 15 — Deploy, add content, verify
Do these in order:
1. Deploy Steps 1–13. The category pages show "No images found" until content exists.
2. Run Step 14 (or retag the existing photos).
3. Upload and tag the photos for each category.
4. Set the carousel again in `/admin/carousel`. Until you do this, the home page shows the fallback (the first photo of each category).
5. Call `POST /api/cache/refresh`.
6. Verify:
   - `/architecture`, `/couples` and `/portraits` return 200 and show photos in order.
   - `/fake` returns 404.
   - `/work/anything` redirects to `/`.
   - The home carousel works, and the admin upload, reorder and delete work.
   - Reorder a category in `/admin`, save, and reload the category page. The new order shows.
   - Send a reorder with a missing photo id. The server returns 409.
   - Save the carousel, call `POST /api/cache/refresh`, and reload `/`. The saved carousel still shows.
   - Delete a photo that is in the carousel. The delete works and the carousel skips that photo.
   - With an empty carousel, `/` shows the fallback photos.
