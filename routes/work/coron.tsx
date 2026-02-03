import type { StrapiImage } from "../../types/strapi.ts";
import { Head } from "fresh/runtime";
import { Image } from "../../components/Image.tsx";
import { PageHeader } from "../../components/PageHeader.tsx";
import { define } from "../../utils.ts";
import { getImagesByAlbum } from "../../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const images = await getImagesByAlbum(ctx.state.kv, "coron") ?? [];
    console.log(`[coron] Retrieved ${images.length} images from cache`);
    return { data: images };
  },
});

export default define.page<typeof handler>(function Coron({ data }) {
  const images = data;

  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Coron Photos</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <PageHeader title="Coron" subtitle="December 2025-January 2026" />
        <div class="flex flex-wrap justify-evenly gap-6 items-center">
          {images.map((image: StrapiImage) => (
            <div key={image.id} class="overflow-hidden max-w-lg fade-in-images">
              <Image
                src={image.url}
                alt={image.alternativeText ?? image.name}
                width={image.width}
                height={image.height}
              />
              {image.caption && (
                <div class="p-4">
                  <p class="text-sm text-gray-600">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {images.length === 0 && (
          <p class="text-center text-gray-500 mt-8">No images found</p>
        )}
      </div>
    </div>
  );
});
