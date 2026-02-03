/// <reference lib="deno.unstable" />

import type {
  AlbumImages,
  CacheMetadata,
  StrapiImage,
} from "../types/strapi.ts";

export const clearCache = async (kv: Deno.Kv): Promise<void> => {
  const albumEntries = kv.list({ prefix: ["albums"] });
  const cacheEntries = kv.list({ prefix: ["cache"] });

  const deleteAlbums = (async () => {
    for await (const entry of albumEntries) {
      await kv.delete(entry.key);
    }
  })();

  const deleteCache = (async () => {
    for await (const entry of cacheEntries) {
      await kv.delete(entry.key);
    }
  })();

  await Promise.all([deleteAlbums, deleteCache]);
};

export const getAllAlbums = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<string>> => {
  const entries = kv.list({ prefix: ["albums"] });
  const albumNames: string[] = [];

  for await (const entry of entries) {
    const albumName = entry.key[1];
    if (typeof albumName === "string") {
      albumNames.push(albumName);
    }
  }

  return albumNames;
};

export const getCacheMetadata = async (
  kv: Deno.Kv,
): Promise<CacheMetadata | null> => {
  const result = await kv.get<CacheMetadata>(["cache", "metadata"]);
  return result.value;
};

export const getAllImages = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<StrapiImage>> => {
  const entries = kv.list<ReadonlyArray<StrapiImage>>({ prefix: ["albums"] });
  const allImages: StrapiImage[] = [];

  for await (const entry of entries) {
    const images = entry.value;
    if (images) {
      allImages.push(...images);
    }
  }

  return allImages;
};

export const getImagesByAlbum = async (
  kv: Deno.Kv,
  albumName: string,
): Promise<ReadonlyArray<StrapiImage> | null> => {
  const result = await kv.get<ReadonlyArray<StrapiImage>>([
    "albums",
    albumName,
  ]);
  return result.value;
};

export const saveAllAlbums = async (
  kv: Deno.Kv,
  albumsMap: AlbumImages,
): Promise<void> => {
  const saveOperations = Array.from(albumsMap.entries()).map((
    [albumName, images],
  ) => saveToCache(kv, albumName, images));

  const totalImages = Array.from(albumsMap.values()).reduce(
    (sum, images) => sum + images.length,
    0,
  );

  const metadata: CacheMetadata = {
    lastRefresh: new Date(),
    totalImages,
    albumCount: albumsMap.size,
  };

  await Promise.all([...saveOperations, saveCacheMetadata(kv, metadata)]);
};

export const saveCacheMetadata = async (
  kv: Deno.Kv,
  metadata: CacheMetadata,
): Promise<void> => {
  await kv.set(["cache", "metadata"], metadata);
};

export const saveToCache = async (
  kv: Deno.Kv,
  albumName: string,
  images: ReadonlyArray<StrapiImage>,
): Promise<void> => {
  await kv.set(["albums", albumName], images);
};
