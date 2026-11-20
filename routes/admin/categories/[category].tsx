import type { SanityPhoto } from "../../../types/sanity.ts";
import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import {
  type Category,
  CATEGORY_LABELS,
  isCategory,
} from "../../../types/category.ts";
import { fetchPhotosByCategory } from "../../../services/photo-service.ts";
import PhotoSorter from "../../../islands/PhotoSorter.tsx";
import PhotoUploader from "../../../islands/PhotoUploader.tsx";

interface CategoryEditorData {
  readonly category: Category;
  readonly photos: ReadonlyArray<SanityPhoto>;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const category = ctx.params.category;
    if (!isCategory(category)) {
      return new Response("Not Found", { status: 404 });
    }

    const photos = await fetchPhotosByCategory(category);

    return { data: { category, photos } satisfies CategoryEditorData };
  },
});

export default define.page<typeof handler>(function CategoryEditor({ data }) {
  const { category, photos } = data;

  return (
    <div>
      <Head>
        <title>{CATEGORY_LABELS[category]} - Admin</title>
      </Head>
      <div class="mb-6">
        <a href="/admin" class="text-sm text-gray-500 hover:text-gray-900">
          ← Categories
        </a>
        <h1 class="text-2xl font-semibold text-gray-900 mt-2">
          {CATEGORY_LABELS[category]}
        </h1>
      </div>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">
          Photos ({photos.length})
        </h2>
        <p class="text-sm text-gray-500">Drag to reorder, then save.</p>
      </div>
      <PhotoSorter category={category} photos={photos} />
      <PhotoUploader category={category} />
    </div>
  );
});
