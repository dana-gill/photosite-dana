import type { StrapiImage } from "../../types/strapi.ts";
import { Head } from "fresh/runtime";
import { Image } from "../../components/Image.tsx";
import { SectionTitle } from "../../components/SectionTitle.tsx";
import { define } from "../../utils.ts";
import { getImagesByAlbum } from "../../services/cache-manager.ts";
import { Subsection } from "../../components/Subsection.tsx";

export const handler = define.handlers({
  GET: async (_ctx) => {
    const images = await getImagesByAlbum("sunchasers") ?? [];
    return { data: images };
  },
});

export default define.page<typeof handler>(function Sunchasers({ data }) {
  const images = data;

  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Sunchasing - Dana Gill Photography</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <SectionTitle>Sunchasing</SectionTitle>
        <Subsection>Chasing fleeting moments at dusk. 2021 - Current.</Subsection>
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
