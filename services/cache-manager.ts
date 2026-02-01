import type { AlbumImages, CacheMetadata, StrapiImage } from "../types/strapi.ts";

let kv: Deno.Kv | null = null;

const getKv = async (): Promise<Deno.Kv> => {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
};

export const clearCache = async (): Promise<void> => {
  const kvInstance = await getKv();
  const albumEntries = kvInstance.list({ prefix: ["albums"] });
  const cacheEntries = kvInstance.list({ prefix: ["cache"] });

  const deleteAlbums = (async () => {
    for await (const entry of albumEntries) {
      await kvInstance.delete(entry.key);
    }
  })();

  const deleteCache = (async () => {
    for await (const entry of cacheEntries) {
      await kvInstance.delete(entry.key);
    }
  })();

  await Promise.all([deleteAlbums, deleteCache]);
};

export const getAllAlbums = async (): Promise<ReadonlyArray<string>> => {
  const kvInstance = await getKv();
  const entries = kvInstance.list({ prefix: ["albums"] });
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
  const kvInstance = await getKv();
  const result = await kvInstance.get<CacheMetadata>(["cache", "metadata"]);
  return result.value;
};

export const getImagesByAlbum = async (albumName: string): Promise<ReadonlyArray<StrapiImage> | null> => {
  const kvInstance = await getKv();
  const result = await kvInstance.get<ReadonlyArray<StrapiImage>>(["albums", albumName]);
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
  const kvInstance = await getKv();
  await kvInstance.set(["cache", "metadata"], metadata);
};

export const saveToCache = async (
  albumName: string,
  images: ReadonlyArray<StrapiImage>
): Promise<void> => {
  const kvInstance = await getKv();
  await kvInstance.set(["albums", albumName], images);
};
