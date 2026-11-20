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
    const allPhotos = photoArrays.flat();
    const photoMap = new Map<string, SanityPhoto>(
      allPhotos.map((p) => [p._id, p]),
    );

    const carouselPhotos = carouselEntries
      .map((entry) => photoMap.get(entry.photoId))
      .filter((p): p is SanityPhoto =>
        p !== undefined && p.image?.asset?.url !== undefined
      );

    return { data: carouselPhotos };
  },
});

export default define.page<typeof handler>(function Home({ data }) {
  const images = data;

  return (
    <div class="md:min-h-screen bg-gray-50 flex justify-center pt-20 md:items-center">
      <CarouselWrapper images={images} />
    </div>
  );
});
