# Carousel Admin Editor

## Context
The home page displays a carousel of photos currently sourced by filtering all Strapi images whose filename contains `--preview`. There is no admin UI to control which photos appear or in what order. The goal is to add a dedicated carousel editor to the admin page so specific photos from any album can be selected and ordered.

---

## Storage Design
A new KV key `["carousel"]` stores an ordered array of `{ photoDocumentId: string }` entries (using photo `documentId` from `StrapiPhoto`). This requires no Strapi schema changes.

---

## Steps

### Step 1 — Add carousel types
**File:** `types/carousel.ts` (new file)

```ts
export interface CarouselEntry {
  readonly photoDocumentId: string;
}
```

### Step 2 — Add cache-manager functions for carousel
**File:** `services/cache-manager.ts`

Add functions (alphabetically ordered):
- `getAllPhotosByDocumentId(kv): Promise<ReadonlyMap<string, StrapiPhoto>>` — lists all `["album-photos", *]` entries and builds a flat map keyed by `photo.documentId`
- `getCarouselEntries(kv): Promise<ReadonlyArray<CarouselEntry>>` — reads `["carousel"]` from KV, returns `[]` if missing
- `saveCarouselEntries(kv, entries): Promise<void>` — writes `["carousel"]` to KV

### Step 3 — Update home page handler
**File:** `routes/index.tsx`

Replace the `--preview` filter logic:
1. Call `getCarouselEntries(kv)` to get the ordered list of `photoDocumentId`s
2. Call `getAllPhotosByDocumentId(kv)` to build a flat map of `photoDocumentId → StrapiPhoto`
3. Map carousel entries to their `StrapiPhoto.image` (`StrapiImage`), preserving order, filtering any missing entries
4. Pass the resulting `StrapiImage[]` to `CarouselWrapper` (no component changes needed)

### Step 4 — Add API route for saving carousel config
**File:** `routes/api/admin/carousel/index.ts` (new file)

```
POST /api/admin/carousel
Body: { entries: Array<{ photoDocumentId: string }> }
```
- Requires basic auth via `isAdminAuthorized`
- Calls `saveCarouselEntries(kv, entries)`
- Returns `{ success: true }`

### Step 5 — Add CarouselEditor island
**File:** `islands/CarouselEditor.tsx` (new file)

Props:
```ts
interface CarouselEditorProps {
  readonly allPhotos: ReadonlyArray<StrapiPhoto & { albumTitle: string }>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}
```

UI:
- Ordered drag-and-drop list of current carousel photos (reuse Sortable.js pattern from `islands/AlbumPhotoSorter.tsx`)
- Each item shows thumbnail + album name + remove button
- A `<select>` grouped by album (`<optgroup>`) to add a photo to the list
- "Save" button that POSTs to `/api/admin/carousel`

### Step 6 — Add admin carousel page
**File:** `routes/admin/carousel.tsx` (new file)

Handler:
1. Fetch all albums via `fetchAllAlbums()`
2. For each album, call `getPhotosByAlbumSlug(kv, slug)` — annotate each photo with its album title
3. Call `getCarouselEntries(kv)` for current config
4. Pass data to `CarouselEditor` island

### Step 7 — Link from admin index
**File:** `routes/admin/index.tsx`

Add a link to `/admin/carousel` near the top of the admin page.

---

## Key Files
| File | Change |
|------|--------|
| `routes/index.tsx` | Replace `--preview` filter with carousel KV lookup |
| `services/cache-manager.ts` | Add `getAllPhotosByDocumentId`, `getCarouselEntries`, `saveCarouselEntries` |
| `types/carousel.ts` | New — `CarouselEntry` interface |
| `islands/CarouselEditor.tsx` | New — drag-and-drop carousel editor |
| `routes/admin/carousel.tsx` | New — admin carousel page |
| `routes/api/admin/carousel/index.ts` | New — POST endpoint to save carousel config |
| `routes/admin/index.tsx` | Add link to carousel editor |

## Reuse
- `islands/AlbumPhotoSorter.tsx` — Sortable.js drag-and-drop pattern
- `services/admin-auth-service.ts` — `isAdminAuthorized`
- `services/album-service.ts` — `fetchAllAlbums`
- `services/cache-manager.ts` — `getPhotosByAlbumSlug`
- `types/album.ts` — `StrapiPhoto`, `StrapiAlbum`

---

## Verification
1. Start the dev server
2. Navigate to `/admin/carousel` — should show an empty carousel editor with all album photos available to add via dropdown
3. Add photos from different albums, reorder by drag-and-drop, click Save
4. Navigate to `/` — carousel should show only the saved photos in the saved order
5. Return to `/admin/carousel` — saved selection should persist after page reload
6. Remove a photo, save, verify home page updates accordingly
