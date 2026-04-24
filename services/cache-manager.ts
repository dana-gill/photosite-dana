/// <reference lib="deno.unstable" />

import type {
  CarouselEntry,
  SanityAlbum,
  SanityPhoto,
} from "../types/sanity.ts";

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

export const getAlbumBySlug = async (
  kv: Deno.Kv,
  slug: string,
): Promise<SanityAlbum | null> => {
  const result = await kv.get<SanityAlbum>(["album", slug]);
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

export const getCarouselEntries = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<CarouselEntry>> => {
  const result = await kv.get<ReadonlyArray<CarouselEntry>>(["carousel"]);
  return result.value ?? [];
};

export const getPhotosByAlbumSlug = async (
  kv: Deno.Kv,
  slug: string,
): Promise<ReadonlyArray<SanityPhoto> | null> => {
  const result = await kv.get<ReadonlyArray<SanityPhoto>>([
    "album-photos",
    slug,
  ]);
  return result.value;
};

export const saveAlbum = async (
  kv: Deno.Kv,
  slug: string,
  album: SanityAlbum,
): Promise<void> => {
  await kv.set(["album", slug], album);
};

export const saveAlbumPhotos = async (
  kv: Deno.Kv,
  slug: string,
  photos: ReadonlyArray<SanityPhoto>,
): Promise<void> => {
  await kv.set(["album-photos", slug], photos);
};

export const saveAllAlbumPhotos = async (
  kv: Deno.Kv,
  albumPhotosMap: ReadonlyMap<
    string,
    { album: SanityAlbum; photos: ReadonlyArray<SanityPhoto> }
  >,
): Promise<void> => {
  const saveOperations = Array.from(albumPhotosMap.entries()).flatMap(
    ([slug, { album, photos }]) => [
      saveAlbum(kv, slug, album),
      saveAlbumPhotos(kv, slug, photos),
    ],
  );

  await Promise.all(saveOperations);
};

export const saveCarouselEntries = async (
  kv: Deno.Kv,
  entries: ReadonlyArray<CarouselEntry>,
): Promise<void> => {
  await kv.set(["carousel"], entries);
};
