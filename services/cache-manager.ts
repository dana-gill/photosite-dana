/// <reference lib="deno.unstable" />

import type { Category } from "../types/category.ts";
import type {
  CarouselEntry,
  SanityAbout,
  SanityPhoto,
} from "../types/sanity.ts";

const deleteByPrefix = async (
  kv: Deno.Kv,
  prefix: Deno.KvKey,
): Promise<void> => {
  for await (const entry of kv.list({ prefix })) {
    await kv.delete(entry.key);
  }
};

export const clearCategoryCache = async (kv: Deno.Kv): Promise<void> => {
  await Promise.all([
    deleteByPrefix(kv, ["category-photos"]),
    deleteByPrefix(kv, ["album"]),
    deleteByPrefix(kv, ["album-photos"]),
  ]);
};

export const getCarouselEntries = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<CarouselEntry>> => {
  const result = await kv.get<ReadonlyArray<CarouselEntry>>(["carousel"]);
  return result.value ?? [];
};

export const getPhotosByCategory = async (
  kv: Deno.Kv,
  category: Category,
): Promise<ReadonlyArray<SanityPhoto>> => {
  const result = await kv.get<ReadonlyArray<SanityPhoto>>([
    "category-photos",
    category,
  ]);
  return result.value ?? [];
};

export const saveCategoryPhotos = async (
  kv: Deno.Kv,
  category: Category,
  photos: ReadonlyArray<SanityPhoto>,
): Promise<void> => {
  await kv.set(["category-photos", category], photos);
};

export const getAbout = async (kv: Deno.Kv): Promise<SanityAbout | null> => {
  const result = await kv.get<SanityAbout>(["about"]);
  return result.value;
};

export const saveAbout = async (
  kv: Deno.Kv,
  about: SanityAbout | null,
): Promise<void> => {
  if (about === null) {
    await kv.delete(["about"]);
    return;
  }
  await kv.set(["about"], about);
};

export const saveCarouselEntries = async (
  kv: Deno.Kv,
  entries: ReadonlyArray<CarouselEntry>,
): Promise<void> => {
  await kv.set(["carousel"], entries);
};
