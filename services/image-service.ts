import { CATEGORIES, type Category } from "../types/category.ts";
import {
  fetchAbout,
  fetchCarouselPhotoIds,
  fetchPhotosByCategory,
} from "./photo-service.ts";
import {
  saveAbout,
  saveCarouselEntries,
  saveCategoryPhotos,
} from "./cache-manager.ts";

export const refreshCategoryCache = async (kv: Deno.Kv): Promise<void> => {
  const [photoArrays, carouselPhotoIds, about] = await Promise.all([
    Promise.all(CATEGORIES.map(fetchPhotosByCategory)),
    fetchCarouselPhotoIds(),
    fetchAbout(),
  ]);

  await Promise.all([
    ...CATEGORIES.map((category, index) =>
      saveCategoryPhotos(kv, category, photoArrays[index] ?? [])
    ),
    saveCarouselEntries(
      kv,
      carouselPhotoIds.map((photoId) => ({ photoId })),
    ),
    saveAbout(kv, about),
  ]);
};

export const refreshCategory = async (
  kv: Deno.Kv,
  category: Category,
): Promise<void> => {
  await saveCategoryPhotos(kv, category, await fetchPhotosByCategory(category));
};
