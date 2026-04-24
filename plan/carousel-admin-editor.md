# Carousel Admin Editor

## Context
The home page displays a carousel of photos currently sourced by filtering all Strapi images whose filename contains `--preview`. There is no admin UI to control which photos appear or in what order. The goal is to add a dedicated carousel editor to the admin page so any image from the full Strapi media library can be selected and ordered.

---

## Storage Design
A new KV key `["carousel"]` stores an ordered array of `CarouselEntry` objects. Each entry stores the numeric Strapi image `id` so any image from the media library (not just album-linked photos) can be included. This requires no Strapi schema changes.

---

## Steps

### Step 1 — Add carousel types
**File:** `types/carousel.ts` (new file)

```ts
export interface CarouselEntry {
  readonly imageId: number; // Strapi media library image id
}
```

### Step 2 — Add cache-manager functions for carousel
**File:** `services/cache-manager.ts`

Add two functions (alphabetically ordered):
- `getCarouselEntries(kv): Promise<ReadonlyArray<CarouselEntry>>` — reads `["carousel"]` from KV, returns `[]` if missing
- `saveCarouselEntries(kv, entries): Promise<void>` — writes `["carousel"]` to KV

### Step 3 — Update home page handler
**File:** `routes/index.tsx`

Replace the `--preview` filter logic:
1. Call `getCarouselEntries(kv)` to get the ordered list of `imageId`s
2. Call `getAllImages(kv)` (already exists in `services/cache-manager.ts`) to get all cached `StrapiImage`s, build a `Map<number, StrapiImage>` keyed by `image.id`
3. Map carousel entries to their `StrapiImage`, preserving order, filtering any missing entries
4. Pass the resulting `StrapiImage[]` to `CarouselWrapper` (no component changes needed)

### Step 4 — Add API route for saving carousel config
**File:** `routes/api/admin/carousel/index.ts` (new file)

```
POST /api/admin/carousel
Body: { entries: Array<{ imageId: number }> }
```
- Requires basic auth via `isAdminAuthorized`
- Calls `saveCarouselEntries(kv, entries)`
- Returns `{ success: true }`

### Step 5 — Add CarouselEditor island
**File:** `islands/CarouselEditor.tsx` (new file)

Props:
```ts
interface CarouselEditorProps {
  readonly allImages: ReadonlyArray<StrapiImage>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}
```

UI:
- Ordered drag-and-drop list of current carousel images (reuse Sortable.js pattern from `islands/AlbumPhotoSorter.tsx`)
- Each item shows thumbnail + image name + remove button
- A `<select>` to add any image from the full Strapi media library
- "Save" button that POSTs to `/api/admin/carousel`

### Step 6 — Add admin carousel page
**File:** `routes/admin/carousel.tsx` (new file)

Handler:
1. Call `fetchAllImagesFromStrapi()` (already exists in `services/image-service.ts`) to get all Strapi media images
2. Call `getCarouselEntries(kv)` for current config
3. Pass data to `CarouselEditor` island

### Step 7 — Link from admin index
**File:** `routes/admin/index.tsx`

Add a link to `/admin/carousel` near the top of the admin page.

---

## Key Files
| File | Change |
|------|--------|
| `routes/index.tsx` | Replace `--preview` filter with carousel KV lookup |
| `services/cache-manager.ts` | Add `getCarouselEntries`, `saveCarouselEntries`; reuse `getAllImages` |
| `types/carousel.ts` | New — `CarouselEntry` interface |
| `islands/CarouselEditor.tsx` | New — drag-and-drop carousel editor |
| `routes/admin/carousel.tsx` | New — admin carousel page |
| `routes/api/admin/carousel/index.ts` | New — POST endpoint to save carousel config |
| `routes/admin/index.tsx` | Add link to carousel editor |

## Reuse
- `islands/AlbumPhotoSorter.tsx` — Sortable.js drag-and-drop pattern
- `services/admin-auth-service.ts` — `isAdminAuthorized`
- `services/cache-manager.ts` — `getAllImages`
- `services/image-service.ts` — `fetchAllImagesFromStrapi`
- `types/strapi.ts` — `StrapiImage`

---

## Verification
1. Start the dev server
2. Navigate to `/admin/carousel` — should show an empty carousel editor with all Strapi media images available in the dropdown
3. Add images from different albums (and unattached images), reorder by drag-and-drop, click Save
4. Navigate to `/` — carousel should show only the saved images in the saved order
5. Return to `/admin/carousel` — saved selection should persist after page reload
6. Remove an image, save, verify home page updates accordingly
