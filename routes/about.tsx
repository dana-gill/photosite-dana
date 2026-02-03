import type { StrapiImage } from "../types/strapi.ts";
import { Head } from "fresh/runtime";
import { Image } from "../components/Image.tsx";
import { define } from "../utils.ts";
import { getImagesByAlbum } from "../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const images = await getImagesByAlbum(ctx.state.kv, "about") ?? [];
    const aboutImage = images.find((img: StrapiImage) => img.name.includes("about_1"));
    return { data: aboutImage ?? null };
  },
});

export default define.page<typeof handler>(function About({ data }) {
  const aboutImage = data;

  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>About - Dana Gill Photography</title>
      </Head>
      <div class="max-w-4xl mx-auto pt-20 flex flex-col md:flex-row gap-8">
        {aboutImage && (
          <div class="flex justify-flex-start fade-in-title">
            <div class="max-w-[2000px] max-h-[1000px]">
              <Image
                src={aboutImage.url}
                alt={aboutImage.alternativeText ?? aboutImage.name}
                width={aboutImage.width}
                height={aboutImage.height}
              />
            </div>
          </div>
        )}
        <div class="prose prose-lg mx-auto fade-in-images">
          <p class="text-gray-700 leading-relaxed">
            Dana Gill is a Filipino artist and engineer based in Berlin. She shoots primarily with analog on a Minolta, but also enjoys shooting digitally. She enjoys capturing portraits and various moments from travels and life.
          </p>
          <p class="text-gray-700 mt-4 leading-relaxed">
            For inquiries, please reach out via email at danougill [@] gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
});
