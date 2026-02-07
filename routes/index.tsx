import { define } from "../utils.ts";
import { getAllImages } from "../services/cache-manager.ts";
import CarouselWrapper from "../islands/CarouselWrapper.tsx";

export const handler = define.handlers({
  GET: async (ctx) => {
    const allImages = await getAllImages(ctx.state.kv);
    const previewImages = allImages
      .filter((image) => image.name.includes("--preview"))
      .slice(0, 10);
    return { data: previewImages };
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
