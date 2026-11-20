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
- **About photo:** This is a separate `about` singleton, not a category photo. The reset never deletes it. The image comes from `assets/about/`.
- **Existing content:** Start fresh. Delete all `album` and `photo` documents and their image assets (Step 14). Do not retag the existing photos. Import the new photos from the local category folders `assets/{architecture,couples,portraits}/` (Step 15).

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

### **[DONE]** Step 1 — Create the Sanity Studio in this repo
**Folder:** `photosite-sanity/` (new, in this repo)

The original Studio code is lost. The content is in Sanity project `serh8kfd`, not in the Studio, so a new Studio connects to the same data. The old schema is not needed because the content starts fresh (Step 14).

**Before you start:** Log in with `npx sanity login`. You must be a member of project `serh8kfd` (check at sanity.io/manage). If you are not a member, create a new project, and update `SANITY_PROJECT_ID`, `CLAUDE.md` and this plan.

1. **Scaffold:** Run `npm create sanity@latest -- --project serh8kfd --dataset production --template clean --typescript --output-path photosite-sanity`. Delete any scaffold files that are `.js` or `.mjs` (for example the ESLint config), or change them to `.ts`.
2. **Files:**
   ```
   photosite-sanity/
     package.json         # own npm deps (sanity, @sanity/vision); scripts: dev, build, deploy
     tsconfig.json
     sanity.cli.ts        # projectId, dataset, studioHost
     sanity.config.ts     # structureTool({ structure }), visionTool()
     structure.ts         # desk lists (see 5)
     schemaTypes/
       index.ts           # export const schemaTypes = [photo, carousel, about]
       categories.ts      # copy of CATEGORIES + labels
       photo.ts
       carousel.ts
       about.ts
   ```
3. **`photo` schema:**
   - Fields: `image` (hotspot, required), `category` (string, required, `options.list` from `categories.ts`, `layout: "radio"`), `order` (number, required, integer, min 1), `altTitle` (string), `caption` (string).
   - `orderings`: by `order asc`.
   - `preview`: the image as media, `altTitle` or the file name as the title, and `category · #order` as the subtitle.
   - There is no `album` type and no `album` field.
4. **`carousel` schema:** A singleton with a fixed `_id` `"carousel"`. `images` is an array of references to `photo` with `weak: true` (see Step 12). In `sanity.config.ts`, hide the "create" and "delete" actions for this type.
   **`about` schema:** A singleton with a fixed `_id` `"about"`. Fields: `image` (hotspot, required) and `altTitle` (string). It is not a `photo`, so it is not in any category, and it is not in the reset (Step 14). Hide the "create" and "delete" actions in the same way as `carousel`.
5. **Desk structure (`structure.ts`):**
   - One list for each category (`_type == "photo" && category == $category`, sorted by `order asc`), in the order Architecture, Couples, Portraits.
   - "All photos".
   - "Carousel", which opens the singleton directly.
   - "About", which opens the `about` singleton directly.
6. **Category list in sync:** The Studio is an npm/Vite project, so it does not import the Deno file `types/category.ts`. `schemaTypes/categories.ts` holds a copy, with a comment that says to keep it the same as `types/category.ts`. A new category needs a change in both files.
7. **Separate the two toolchains:**
   - `deno.json`: add `"photosite-sanity/**"` to `exclude`, so `deno fmt`, `deno lint` and `deno check` skip the Studio.
   - `.gitignore`: add `photosite-sanity/.sanity/` and `photosite-sanity/dist/`. The `node_modules/` rule already covers the Studio.
   - Optional root task in `deno.json`: `"studio": "cd photosite-sanity && npm run dev"`.
8. **Run and deploy:**
   - Local: run `npm install` and `npm run dev` in `photosite-sanity/` (http://localhost:3333).
   - Schema: `npx sanity schema deploy`.
   - Hosted Studio: `npx sanity deploy` (`https://<studioHost>.sanity.studio`).
9. **Old content:** Until Step 14 runs, old `album` docs and the `photo.album` fields show as unknown types or fields in the Studio. This is expected.

### **[DONE]** Step 2 — Add the category constants and type
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

### **[DONE]** Step 3 — Update the Sanity types
**File:** `types/sanity.ts`

- Remove `SanityAlbum`.
- In `SanityPhoto`, replace `album: { _ref } | null` with `category: Category`.

### **[DONE]** Step 4 — Replace the album queries with category queries
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

- `refreshAlbumCache` → `refreshCategoryCache`: fetch `CATEGORIES.map(fetchPhotosByCategory)` and the carousel ids in parallel, then save each category and the carousel. Also fetch the `about` singleton and save it to KV `["about"]`.
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
- `routes/about.tsx`: read the About photo from KV `["about"]`, not from the `"about"` album (that album does not exist in Sanity, so the live page shows no photo now). Replace the old Strapi `og:image` and `twitter:image` URLs on this page and in `routes/_app.tsx` with the About image URL. The Strapi host no longer responds.
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
- **Optional:** For drag and drop in Studio too, add `@sanity/orderable-document-list` to `photosite-sanity/package.json`. This plugin uses its own `orderRank` field. Choose only one of `order` or `orderRank` as the source of truth. Do not use both. This plan uses `order`.

### Step 12 — Rebuild the home page carousel
**Files:** `photosite-sanity/schemaTypes/carousel.ts`, `routes/api/admin/carousel/index.ts`, `islands/CarouselEditor.tsx`, `routes/admin/carousel.tsx`, `routes/index.tsx`, `services/photo-service.ts`

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
- "Sanity Studio" section: the Studio is in `photosite-sanity/` in this repo and uses npm, not Deno (`npm install`, `npm run dev`, `npx sanity deploy`). Remove the incorrect "`deno task dev` from there" text. Add: keep `photosite-sanity/schemaTypes/categories.ts` the same as `types/category.ts`.

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
  4. Deletes all `sanity.imageAsset` docs that nothing references, so no old images stay in the dataset.
- The script never deletes the `about` document or its image asset. Its queries filter on `_type in ["photo", "album"]` only. Before the asset purge, it also adds the `about` image asset id to a keep list. The dry run prints "kept: about (<filename>)".
- Uses one transaction for each batch of 100 IDs.
- The existing photos are not retagged. All photos come again from the local category folders (Step 15).

### Step 15 — Import photos from the local category folders
**File:** `scripts/import-photos.ts` (new)

The source is a folder with one subfolder for each category. The subfolder names are the category values:

```
assets/
  architecture/   45 images
  couples/         6 images
  portraits/      12 images
```

- **Usage:** `deno run -A --env scripts/import-photos.ts [root=assets] [--confirm]`
- **Input checks:**
  - Read the subfolders whose names pass `isCategory` as photos. `about/` and `carousel/` have special rules (see below). For any other subfolder, print a warning and skip it.
  - Take only image files: `.jpg`, `.jpeg` and `.png`, with any letter case (the folders have `.JPG`, `.JPEG`, `.jpg` and `.PNG`). Skip `.DS_Store` and all other files.
- **Order:** Sort the files in each folder by name with a natural sort (`IMG_2029` before `IMG_10001`). Set `order = index + 1`. Change the order later in `/admin` (Step 11).
- **Dry run (the default):** For each category, print the file count and the first and last file names. Do not upload.
- **With `--confirm`, for each file:**
  1. Upload with `client.assets.upload("image", stream, { filename })`.
  2. Create a `photo` document with `{ image, category, order }`. `altTitle` and `caption` stay empty, and you can add them later in Studio or `/admin`.
- **Re-runs:** Sanity removes duplicate assets by content hash. Before the script creates a `photo`, it checks whether a `photo` already uses that asset in that category. If one does, it skips the file. This means a failed run can be started again with no duplicate photos.
- **Speed:** Upload 3 files at the same time. Print progress (`architecture 12/45`) and a list of failures at the end. If a file fails, the run continues and the script exits with code 1.
- **Size:** The folders hold about 150 MB, and some files are larger than 5 MB. Sanity accepts these files, and the site gets smaller versions through the Sanity image CDN. Do not resize the files before upload.
- **`assets/about/` (one image):** Upload the image and set it on the `about` singleton (`createOrReplace({ _id: "about", _type: "about", image })`). If the folder has 0 or more than 1 image, stop with an error. If the folder does not exist, do not change `about`.
- **`assets/carousel/` (10 images):** Each file is a byte-identical copy of a photo in a category folder (this was checked). Sanity gives the same content the same asset id, so the script finds each carousel file's asset, finds the `photo` that uses that asset, and sets `carousel.images` to those photos as weak refs, in file-name order. A carousel file that matches no category photo is an error. It is reported, and the carousel is not set.
- **Git:** Add `assets/architecture/`, `assets/couples/`, `assets/portraits/`, `assets/about/`, `assets/carousel/` and `.DS_Store` to `.gitignore`. Do not commit 150 MB of photos. Sanity is the stored copy.

### Step 16 — Deploy, add content, verify
Do these in order:
1. Deploy Steps 1–13. The category pages show "No images found" until content exists.
2. Export the backup and run Step 14 with `--confirm`.
3. Run Step 15 without flags (dry run) and check the counts: 45 / 6 / 12. Then run it again with `--confirm`.
4. Check the carousel set by Step 15 from `assets/carousel/`. Change it in `/admin/carousel` if needed. If the carousel is empty, the home page shows the fallback (the first photo of each category).
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
   - `/about` shows the About photo. After the reset, the `about` document and its asset still exist.
