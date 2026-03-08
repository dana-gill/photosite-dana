/// <reference lib="deno.ns" />

import { load } from "jsr:@std/dotenv";

await load({ export: true });

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_FULL_ADMIN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

if (!STRAPI_API_TOKEN || !STRAPI_URL) {
  console.error("Missing STRAPI_API_TOKEN or STRAPI_URL in environment");
  Deno.exit(1);
}

interface StrapiAlbum {
  readonly documentId: string;
  readonly slug: string;
  readonly title: string;
}

interface StrapiAlbumResponse {
  readonly data: ReadonlyArray<StrapiAlbum>;
  readonly meta: {
    readonly pagination: { readonly total: number };
  };
}

interface StrapiPhotoCountResponse {
  readonly meta: {
    readonly pagination: { readonly total: number };
  };
}

const strapiHeaders: HeadersInit = {
  "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
  "Content-Type": "application/json",
};

const fetchAllAlbums = async (): Promise<ReadonlyArray<StrapiAlbum>> => {
  const response = await fetch(`${STRAPI_URL}api/albums?pagination[pageSize]=100`, {
    headers: strapiHeaders,
  });
  if (!response.ok) throw new Error(`Failed to fetch albums: ${response.statusText}`);
  const data: StrapiAlbumResponse = await response.json();
  return data.data;
};

const fetchPhotoCount = async (albumDocumentId: string): Promise<number> => {
  const url = `${STRAPI_URL}api/photos?filters[album][documentId][$eq]=${encodeURIComponent(albumDocumentId)}&pagination[pageSize]=1`;
  const response = await fetch(url, { headers: strapiHeaders });
  if (!response.ok) throw new Error(`Failed to fetch photo count for ${albumDocumentId}: ${response.statusText}`);
  const data: StrapiPhotoCountResponse = await response.json();
  return data.meta.pagination.total;
};

const deleteAlbum = async (documentId: string): Promise<void> => {
  const response = await fetch(`${STRAPI_URL}api/albums/${documentId}`, {
    method: "DELETE",
    headers: strapiHeaders,
  });
  if (!response.ok) throw new Error(`Failed to delete album ${documentId}: ${response.statusText}`);
};

const isDryRun = Deno.args.includes("--dry-run");
const isList = Deno.args.includes("--list");

console.log(`\nFetching all albums from Strapi...`);
const albums = await fetchAllAlbums();
console.log(`Found ${albums.length} albums\n`);

console.log("Fetching photo counts...\n");
const withCounts = await Promise.all(
  albums.map(async (album) => ({
    album,
    photoCount: await fetchPhotoCount(album.documentId),
  })),
);

if (isList) {
  const sorted = [...withCounts].sort((a, b) => a.album.title.localeCompare(b.album.title));
  sorted.forEach((e) => console.log(`[${e.photoCount} photos] ${e.album.title} | slug: ${e.album.slug} | id: ${e.album.documentId}`));
  Deno.exit(0);
}

const toDelete = withCounts
  .filter((entry) => entry.album.title.trim().toLowerCase().endsWith("preview"))
  .map((entry) => ({
    documentId: entry.album.documentId,
    reason: "auto-generated preview album",
    title: entry.album.title,
  }));

if (toDelete.length === 0) {
  console.log("\nNo duplicates to delete.");
  Deno.exit(0);
}

console.log(`\n${isDryRun ? "[DRY RUN] " : ""}Albums to delete:`);
toDelete.forEach((e) => console.log(`  - ${e.title} (${e.documentId}): ${e.reason}`));

if (isDryRun) {
  console.log("\nDry run complete. Pass no flags to perform deletion.");
  Deno.exit(0);
}

console.log("\nDeleting...");
await Promise.all(
  toDelete.map(async (entry) => {
    await deleteAlbum(entry.documentId);
    console.log(`  Deleted: ${entry.title}`);
  }),
);

console.log("\nDone.");
