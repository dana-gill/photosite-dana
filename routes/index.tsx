import { define } from "../utils.ts";
import {
  getCarouselEntries,
  getPhotosByCategory,
} from "../services/cache-manager.ts";
import { CATEGORIES } from "../types/category.ts";
import type { SanityPhoto } from "../types/sanity.ts";
import CarouselWrapper from "../islands/CarouselWrapper.tsx";

export const handler = define.handlers({
  GET: async (ctx) => {
    const [carouselEntries, photoArrays] = await Promise.all([
      getCarouselEntries(ctx.state.kv),
      Promise.all(
        CATEGORIES.map((category) =>
          getPhotosByCategory(ctx.state.kv, category)
        ),
      ),
    ]);
    const photoMap = new Map<string, SanityPhoto>(
      photoArrays.flat().map((p) => [p._id, p]),
    );
    const hasImageUrl = (p: SanityPhoto) => p.image?.asset?.url !== undefined;

    const carouselPhotos = carouselEntries
      .map((entry) => photoMap.get(entry.photoId))
      .filter((p): p is SanityPhoto => p !== undefined && hasImageUrl(p));

    const fallbackPhotos = photoArrays
      .flatMap((photos) => photos.slice(0, 1))
      .filter(hasImageUrl);

    return {
      data: carouselPhotos.length > 0 ? carouselPhotos : fallbackPhotos,
    };
  },
});

export default define.page<typeof handler>(function Home({ data }) {
  const images = data;

  return (
    <div class="md:min-h-screen bg-gray-50 flex justify-center pt-20 md:items-center">
      {images.length > 0 && <CarouselWrapper images={images} />}
    </div>
  );
});
