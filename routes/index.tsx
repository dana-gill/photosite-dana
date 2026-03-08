import { define } from "../utils.ts";
import { getAllImages, getCarouselEntries } from "../services/cache-manager.ts";
import CarouselWrapper from "../islands/CarouselWrapper.tsx";

export const handler = define.handlers({
  GET: async (ctx) => {
    const [carouselEntries, allImages] = await Promise.all([
      getCarouselEntries(ctx.state.kv),
      getAllImages(ctx.state.kv),
    ]);
    const imageMap = new Map(allImages.map((image) => [image.id, image]));
    const carouselImages = carouselEntries
      .map((entry) => imageMap.get(entry.imageId))
      .filter((image) => image !== undefined);
    return { data: carouselImages };
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
