import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
} from "../../types/category.ts";
import { fetchPhotosByCategory } from "../../services/photo-service.ts";

interface CategoryRow {
  readonly category: Category;
  readonly photoCount: number;
}

export const handler = define.handlers({
  GET: async () => {
    const rows = await Promise.all(
      CATEGORIES.map(async (category): Promise<CategoryRow> => {
        const photos = await fetchPhotosByCategory(category);
        return { category, photoCount: photos.length };
      }),
    );

    return { data: rows };
  },
});

export default define.page<typeof handler>(function AdminIndex({ data }) {
  const rows = data;

  return (
    <div>
      <Head>
        <title>Admin - Dana Gill Photography</title>
      </Head>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Categories</h1>
        <a
          href="/admin/carousel"
          class="text-sm text-gray-500 hover:text-gray-900"
        >
          Carousel Editor →
        </a>
      </div>
      <ul class="divide-y divide-gray-200 bg-white rounded border border-gray-200">
        {rows.map((row) => (
          <li
            key={row.category}
            class="flex items-center justify-between px-4 py-3"
          >
            <a
              href={`/admin/categories/${row.category}`}
              class="font-medium text-gray-900 hover:underline"
            >
              {CATEGORY_LABELS[row.category]}
            </a>
            <span class="text-sm text-gray-500">{row.photoCount} photos</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
