import { createClient } from "@sanity/client";
import type {
  StrapiAlbum,
  StrapiListResponse,
  StrapiPhoto,
} from "./migrate-strapi-to-sanity-types.ts";

const SANITY_PROJECT_ID = Deno.env.get("SANITY_PROJECT_ID") ?? "";
const SANITY_DATASET = Deno.env.get("SANITY_DATASET") ?? "production";
const SANITY_API_TOKEN = Deno.env.get("SANITY_API_TOKEN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";
const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";

if (
  !SANITY_PROJECT_ID || !SANITY_API_TOKEN || !STRAPI_URL || !STRAPI_API_TOKEN
) {
  console.error(
    "Missing required env vars: SANITY_PROJECT_ID, SANITY_API_TOKEN, STRAPI_URL, STRAPI_API_TOKEN",
  );
  Deno.exit(1);
}

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: "2026-03-14",
  token: SANITY_API_TOKEN,
  useCdn: false,
});

const strapiHeaders = { Authorization: `Bearer ${STRAPI_API_TOKEN}` };

const fetchStrapi = async <T>(path: string): Promise<StrapiListResponse<T>> => {
  const res = await fetch(`${STRAPI_URL}${path}`, { headers: strapiHeaders });
  if (!res.ok) throw new Error(`Strapi fetch failed: ${res.status} ${path}`);
  return res.json() as Promise<StrapiListResponse<T>>;
};

const fetchAllAlbums = async (): Promise<ReadonlyArray<StrapiAlbum>> => {
  const res = await fetchStrapi<StrapiAlbum>(
    "api/albums?pagination%5BpageSize%5D=100",
  );
  return res.data;
};

const fetchAllPhotos = async (): Promise<ReadonlyArray<StrapiPhoto>> => {
  const first = await fetchStrapi<StrapiPhoto>(
    "api/photos?populate%5B0%5D=image&populate%5B1%5D=album&pagination%5BpageSize%5D=100&pagination%5Bpage%5D=1",
  );
  const rest = await Promise.all(
    Array.from(
      { length: first.meta.pagination.pageCount - 1 },
      (_, i) =>
        fetchStrapi<StrapiPhoto>(
          `api/photos?populate%5B0%5D=image&populate%5B1%5D=album&pagination%5BpageSize%5D=100&pagination%5Bpage%5D=${
            i + 2
          }`,
        ).then((r) => r.data),
    ),
  );
  return [...first.data, ...rest.flat()];
};

const migrateAlbum = async (album: StrapiAlbum): Promise<string> => {
  const sanityId = `album-${album.slug}`;
  await sanity.createOrReplace({
    _id: sanityId,
    _type: "album",
    title: album.title,
    slug: { _type: "slug", current: album.slug },
    description: album.description ?? null,
  });
  console.log(`  ✓ Album: ${album.title}`);
  return sanityId;
};

const migratePhoto = async (
  photo: StrapiPhoto,
  sanityAlbumId: string,
): Promise<void> => {
  console.log(`  Uploading: ${photo.image.name}`);
  const imageRes = await fetch(photo.image.url);
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch image: ${photo.image.url}`);
  }
  const buffer = await imageRes.arrayBuffer();
  const asset = await sanity.assets.upload("image", new Uint8Array(buffer), {
    filename: photo.image.name,
    contentType: imageRes.headers.get("content-type") ?? "image/jpeg",
  });
  await sanity.createOrReplace({
    _id: `photo-${photo.documentId}`,
    _type: "photo",
    album: { _type: "reference", _ref: sanityAlbumId },
    order: photo.order,
    caption: photo.caption ?? null,
    altTitle: photo.altTitle ?? null,
    image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
  });
  console.log(`  ✓ ${photo.image.name}`);
};

const migrate = async (): Promise<void> => {
  console.log("Fetching albums from Strapi...");
  const albums = await fetchAllAlbums();
  console.log(`Found ${albums.length} albums\n`);

  console.log("Fetching photos from Strapi...");
  const photos = await fetchAllPhotos();
  console.log(`Found ${photos.length} photos\n`);

  console.log("Creating albums in Sanity...");
  const albumIdMap = new Map<string, string>();
  for (const album of albums) {
    const sanityId = await migrateAlbum(album);
    albumIdMap.set(album.documentId, sanityId);
  }

  console.log("\nUploading photos to Sanity...");
  const errors: string[] = [];
  const sorted = [...photos].sort((a, b) => a.order - b.order);

  for (const photo of sorted) {
    if (!photo.album) {
      console.log(
        `  — Skipping orphaned photo (no album): ${photo.image.name}`,
      );
      continue;
    }
    const sanityAlbumId = albumIdMap.get(photo.album.documentId);
    if (!sanityAlbumId) {
      errors.push(
        `No album found for photo ${photo.image.name} (albumDocumentId: ${photo.album.documentId})`,
      );
      continue;
    }
    try {
      await migratePhoto(photo, sanityAlbumId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      console.error(`  ✗ ${message}`);
    }
  }

  const successCount = photos.length - errors.length;
  console.log(`\n--- Migration complete ---`);
  console.log(`Photos uploaded: ${successCount}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error("\nErrors encountered:");
    errors.forEach((e) => console.error(`  - ${e}`));
    Deno.exit(1);
  }
};

await migrate();
