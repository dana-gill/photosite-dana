import type { SanityPhoto } from "../types/sanity.ts";
import { Head } from "fresh/runtime";
import { Image } from "../components/Image.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { define } from "../utils.ts";
import { getPhotosByCategory } from "../services/cache-manager.ts";
import { CATEGORY_LABELS, isCategory } from "../types/category.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const param = ctx.params.category;
    if (!isCategory(param)) {
      return new Response("Not Found", { status: 404 });
    }

    const photos = await getPhotosByCategory(ctx.state.kv, param);
    return { data: { category: param, photos } };
  },
});

export default define.page<typeof handler>(function CategoryPage({ data }) {
  const { category, photos } = data;
  const label = CATEGORY_LABELS[category];

  return (
    <div class="px-4 py-8 mx-auto md:min-h-screen bg-gray-50">
      <Head>
        <title>{label} - Dana Gill Photography</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <PageHeader title={label} subtitle="" />
        <div class="flex flex-wrap justify-evenly gap-6 items-center">
          {photos.map((photo: SanityPhoto) => (
            <div
              key={photo._id}
              class="overflow-hidden max-w-lg fade-in-images"
            >
              <Image
                alt={photo.altTitle ?? photo.caption ?? photo.image.asset._id}
                height={photo.image.asset.metadata?.dimensions.height ?? 0}
                src={photo.image.asset.url}
                width={photo.image.asset.metadata?.dimensions.width ?? 0}
              />
              {photo.caption && (
                <div class="p-4">
                  <p class="text-sm text-gray-600">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {photos.length === 0 && (
          <p class="text-center text-gray-500 mt-8">No images found</p>
        )}
      </div>
    </div>
  );
});
