import type { AlbumImages, CacheMetadata, StrapiImage } from "../types/strapi.ts";

const kv = await Deno.openKv();

export const clearCache = async (): Promise<void> => {
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

export const getAllAlbums = async (): Promise<ReadonlyArray<string>> => {
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

export const getCacheMetadata = async (): Promise<CacheMetadata | null> => {
  const result = await kv.get<CacheMetadata>(["cache", "metadata"]);
  return result.value;
};

export const getImagesByAlbum = async (albumName: string): Promise<ReadonlyArray<StrapiImage> | null> => {
  const result = await kv.get<ReadonlyArray<StrapiImage>>(["albums", albumName]);
  return result.value;
};

export const initializeCache = async (): Promise<void> => {
  // KV is already initialized at module level
  // This function exists for explicit initialization if needed in the future
};

export const saveAllAlbums = async (albumsMap: AlbumImages): Promise<void> => {
  const saveOperations = Array.from(albumsMap.entries()).map(([albumName, images]) =>
    saveToCache(albumName, images)
  );

  const totalImages = Array.from(albumsMap.values()).reduce(
    (sum, images) => sum + images.length,
    0
  );

  const metadata: CacheMetadata = {
    lastRefresh: new Date(),
    totalImages,
    albumCount: albumsMap.size,
  };

  await Promise.all([...saveOperations, saveCacheMetadata(metadata)]);
};

export const saveCacheMetadata = async (metadata: CacheMetadata): Promise<void> => {
  await kv.set(["cache", "metadata"], metadata);
};

export const saveToCache = async (
  albumName: string,
  images: ReadonlyArray<StrapiImage>
): Promise<void> => {
  await kv.set(["albums", albumName], images);
};
