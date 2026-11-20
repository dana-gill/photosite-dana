import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { getCarouselEntries } from "../../services/cache-manager.ts";
import { CATEGORIES } from "../../types/category.ts";
import { fetchPhotosByCategory } from "../../services/photo-service.ts";
import CarouselEditor from "../../islands/CarouselEditor.tsx";
import type { CarouselEntry, SanityPhoto } from "../../types/sanity.ts";

interface CarouselPageData {
  readonly allPhotos: ReadonlyArray<SanityPhoto>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const [photoArrays, initialEntries] = await Promise.all([
      Promise.all(CATEGORIES.map(fetchPhotosByCategory)),
      getCarouselEntries(ctx.state.kv),
    ]);
    const allPhotos = photoArrays.flat();

    return { data: { allPhotos, initialEntries } satisfies CarouselPageData };
  },
});

export default define.page<typeof handler>(function CarouselPage({ data }) {
  const { allPhotos, initialEntries } = data;

  return (
    <div>
      <Head>
        <title>Carousel Editor - Admin</title>
      </Head>
      <div class="mb-6">
        <a href="/admin" class="text-sm text-gray-500 hover:text-gray-900">
          ← Admin
        </a>
        <h1 class="text-2xl font-semibold text-gray-900 mt-2">
          Carousel Editor
        </h1>
        <p class="text-sm text-gray-500 mt-1">Drag to reorder, then save.</p>
      </div>
      <CarouselEditor allPhotos={allPhotos} initialEntries={initialEntries} />
    </div>
  );
});
