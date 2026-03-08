import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { getCarouselEntries } from "../../services/cache-manager.ts";
import { fetchAllImagesFromStrapi } from "../../services/image-service.ts";
import CarouselEditor from "../../islands/CarouselEditor.tsx";
import type { CarouselEntry } from "../../types/carousel.ts";
import type { StrapiImage } from "../../types/strapi.ts";

interface CarouselPageData {
  readonly allImages: ReadonlyArray<StrapiImage>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const [allImages, initialEntries] = await Promise.all([
      fetchAllImagesFromStrapi(),
      getCarouselEntries(ctx.state.kv),
    ]);
    return { data: { allImages, initialEntries } satisfies CarouselPageData };
  },
});

export default define.page<typeof handler>(function CarouselPage({ data }) {
  const { allImages, initialEntries } = data;

  return (
    <div>
      <Head>
        <title>Carousel Editor - Admin</title>
      </Head>
      <div class="mb-6">
        <a href="/admin" class="text-sm text-gray-500 hover:text-gray-900">← Admin</a>
        <h1 class="text-2xl font-semibold text-gray-900 mt-2">Carousel Editor</h1>
        <p class="text-sm text-gray-500 mt-1">Drag to reorder, then save.</p>
      </div>
      <CarouselEditor allImages={allImages} initialEntries={initialEntries} />
    </div>
  );
});
