import type { StrapiImage } from "../types/strapi.ts";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getImagesByAlbum } from "../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const images = await getImagesByAlbum("meri2025") ?? [];
    return { data: images };
  },
});

export default define.page<ReadonlyArray<StrapiImage>>(function Home({ data }) {
  const images = data;

  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Meri 2025 Photos</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <h1 class="text-4xl font-bold mb-8 text-center">Meri 2025</h1>
        <div class="flex flex-wrap justify-evenly gap-6">
          {images.map((image) => (
            <div key={image.id} class="bg-white overflow-hidden max-w-lg">
              <img
                src={image.url}
                alt={image.alternativeText ?? image.name}
                width={image.width}
                height={image.height}
                class="w-full h-auto max-h-96"
                loading="lazy"
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
