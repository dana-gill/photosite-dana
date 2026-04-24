# Migration Plan: Strapi -> Sanity

Project ID: serh8kfd | Dataset: production

## Current State (Strapi)

- **Album**: title, slug, description, photos (one-to-many)
- **Photo**: image (media), caption, altTitle, order, album (relation)
- **Carousel**: stored in Deno KV as `[{imageId: number}]` referencing Strapi media IDs
- `photosite-dana` talks to Strapi for all CRUD and uses Deno KV as a read cache

---

## Step 1 — Create Sanity Studio project (`photosite-sanity/`)

- New Sanity Studio project alongside `photosite-dana` and `photosite-strapi`
- Define `album`, `photo`, and `carousel` document types:
  - **album**: title (string, required), slug (slug, required), description (text)
  - **photo**: image (image, hotspot, required), caption (string), altTitle (string), order (number, required), album (reference -> album, required)
  - **carousel**: singleton document, images array of references -> photo
- Deploy schema to `serh8kfd/production`

## Step 2 — Replace types in `photosite-dana`

- Delete `types/strapi.ts`, `types/album.ts`, `types/carousel.ts`
- Create `types/sanity.ts` with:
  - `SanityImageAsset`, `SanityImageFormat`, `SanityImageFormats`
  - `SanityAlbum`, `SanityPhoto`, `CarouselEntry`
  - No more `Strapi*` prefix; image URLs come from Sanity CDN via `@sanity/image-url`

## Step 3 — Replace `album-service.ts` with Sanity client

- Replace all Strapi REST calls with `@sanity/client` GROQ queries and mutations
- Functions to reimplement:
  - `fetchAllAlbums` → `*[_type == "album"]`
  - `fetchAlbumBySlug` → `*[_type == "album" && slug.current == $slug][0]`
  - `fetchPhotosByAlbum` → `*[_type == "photo" && album._ref == $albumId] | order(order asc)`
  - `createAlbum` → `client.create({ _type: "album", ... })`
  - `updateAlbum` → `client.patch(_id).set({ ... })`
  - `deleteAlbum` → `client.delete(_id)`
  - `createPhoto` → `client.create({ _type: "photo", ... })`
  - `deletePhoto` → `client.delete(_id)`
  - `uploadMediaFile` → `client.assets.upload("image", file)`
- Env vars: replace `STRAPI_URL`, `STRAPI_API_TOKEN`, `STRAPI_API_FULL_ADMIN`
  with `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN`

## Step 4 — Replace `image-service.ts`

- Remove `fetchAllImagesFromStrapi`, `groupImagesByAlbum` (Strapi-specific logic)
- `refreshCache`: query all photos with populated image asset from Sanity, group by album slug, save to KV
- `refreshAlbumCache`: query albums + photos from Sanity, save to KV

## Step 5 — Update `cache-manager.ts`

- KV cache structure stays the same
- Swap all `StrapiImage` / `StrapiAlbum` / `StrapiPhoto` type references
  to `SanityImageAsset` / `SanityAlbum` / `SanityPhoto` from `types/sanity.ts`

## Step 6 — Update routes and islands

- Swap `documentId` (Strapi) for `_id` (Sanity) throughout:
  - `routes/admin/albums/[documentId].tsx`
  - `routes/api/admin/albums/[documentId]/*.ts`
  - `islands/AlbumPhotoSorter.tsx`
  - `islands/EditAlbumFields.tsx`
  - `islands/DeleteAlbumButton.tsx`
  - `islands/CreateAlbumForm.tsx`
  - `islands/PhotoUploader.tsx`
- `reorder.ts`: replace Strapi PUT calls with `client.patch(_id).set({ order })`
- `carousel/index.ts`: carousel entries reference Sanity photo `_id` (string) instead of numeric Strapi `imageId`
- `CarouselEditor.tsx`: work with Sanity image references (string `_id`, not number `id`), build thumbnail URLs via `@sanity/image-url` `urlFor()`
- `routes/index.tsx`: carousel images fetched via Sanity asset URLs
- Update all type imports across routes and islands

## Step 7 — Update `CLAUDE.md`

- Remove all references to Strapi
- Add Sanity Studio instructions for managing albums, photos, and carousel
- Update "Adding a New Album" section for the Sanity workflow

---

## Commit Strategy

Each step is its own commit. Step 1 (schema) can be done in parallel with steps 2–7
since it only touches the new `photosite-sanity/` directory. Steps 2–6 must be done
in order as each depends on the previous. `photosite-strapi/` can be deleted after
step 7 is verified working.
