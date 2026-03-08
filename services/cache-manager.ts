/// <reference lib="deno.unstable" />

import type {
  AlbumImages,
  CacheMetadata,
  StrapiImage,
} from "../types/strapi.ts";
import type { StrapiAlbum, StrapiPhoto } from "../types/album.ts";
import type { CarouselEntry } from "../types/carousel.ts";

export const clearAlbumCache = async (kv: Deno.Kv): Promise<void> => {
  const albumEntries = kv.list({ prefix: ["album"] });
  const albumPhotosEntries = kv.list({ prefix: ["album-photos"] });

  const deleteAlbums = (async () => {
    for await (const entry of albumEntries) {
      await kv.delete(entry.key);
    }
  })();

  const deleteAlbumPhotos = (async () => {
    for await (const entry of albumPhotosEntries) {
      await kv.delete(entry.key);
    }
  })();

  await Promise.all([deleteAlbums, deleteAlbumPhotos]);
};

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

export const getAlbumBySlug = async (
  kv: Deno.Kv,
  slug: string,
): Promise<StrapiAlbum | null> => {
  const result = await kv.get<StrapiAlbum>(["album", slug]);
  return result.value;
};

export const getAllAlbumSlugs = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<string>> => {
  const entries = kv.list({ prefix: ["album"] });
  const slugs: string[] = [];

  for await (const entry of entries) {
    const slug = entry.key[1];
    if (typeof slug === "string") {
      slugs.push(slug);
    }
  }

  return slugs;
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

export const getCarouselEntries = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<CarouselEntry>> => {
  const result = await kv.get<ReadonlyArray<CarouselEntry>>(["carousel"]);
  return result.value ?? [];
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

export const getPhotosByAlbumSlug = async (
  kv: Deno.Kv,
  slug: string,
): Promise<ReadonlyArray<StrapiPhoto> | null> => {
  const result = await kv.get<ReadonlyArray<StrapiPhoto>>(["album-photos", slug]);
  return result.value;
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

export const saveAlbum = async (
  kv: Deno.Kv,
  slug: string,
  album: StrapiAlbum,
): Promise<void> => {
  await kv.set(["album", slug], album);
};

export const saveAllAlbumPhotos = async (
  kv: Deno.Kv,
  albumPhotosMap: ReadonlyMap<string, { album: StrapiAlbum; photos: ReadonlyArray<StrapiPhoto> }>,
): Promise<void> => {
  const saveOperations = Array.from(albumPhotosMap.entries()).flatMap(
    ([slug, { album, photos }]) => [
      saveAlbum(kv, slug, album),
      saveAlbumPhotos(kv, slug, photos),
    ],
  );

  await Promise.all(saveOperations);
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

export const saveAlbumPhotos = async (
  kv: Deno.Kv,
  slug: string,
  photos: ReadonlyArray<StrapiPhoto>,
): Promise<void> => {
  await kv.set(["album-photos", slug], photos);
};

export const saveCacheMetadata = async (
  kv: Deno.Kv,
  metadata: CacheMetadata,
): Promise<void> => {
  await kv.set(["cache", "metadata"], metadata);
};

export const saveCarouselEntries = async (
  kv: Deno.Kv,
  entries: ReadonlyArray<CarouselEntry>,
): Promise<void> => {
  await kv.set(["carousel"], entries);
};

export const saveToCache = async (
  kv: Deno.Kv,
  albumName: string,
  images: ReadonlyArray<StrapiImage>,
): Promise<void> => {
  await kv.set(["albums", albumName], images);
};
