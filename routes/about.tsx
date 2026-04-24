import type { SanityPhoto } from "../types/sanity.ts";
import { Head } from "fresh/runtime";
import { Image } from "../components/Image.tsx";
import { define } from "../utils.ts";
import { getAlbumBySlug, getPhotosByAlbumSlug } from "../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const album = await getAlbumBySlug(ctx.state.kv, "about");
    if (!album) return { data: null };

    const photos = await getPhotosByAlbumSlug(ctx.state.kv, "about");
    const aboutPhoto = photos?.[0] ?? null;
    return { data: aboutPhoto };
  },
});

export default define.page<typeof handler>(function About({ data }) {
  const aboutPhoto: SanityPhoto | null = data;

  return (
    <div class="px-4 py-8 mx-auto md:min-h-screen bg-gray-50">
      <Head>
        <title>About - Dana Gill Photography</title>
        <meta property="og:title" content="About - Dana Gill Photography" />
        <meta
          property="og:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          property="og:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
        <meta
          property="og:url"
          content="https://www.danagill.photography/about"
        />
        <meta name="twitter:title" content="About - Dana Gill Photography" />
        <meta
          name="twitter:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          name="twitter:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
      </Head>
      <div class="max-w-4xl mx-auto pt-20 flex flex-col md:flex-row gap-8">
        {aboutPhoto && (
          <div class="flex justify-flex-start fade-in-title">
            <div class="max-w-[1000px] max-h-[2000px]">
              <Image
                alt={aboutPhoto.altTitle ?? aboutPhoto.caption ?? "About"}
                height={aboutPhoto.image.asset.metadata.dimensions.height}
                src={aboutPhoto.image.asset.url}
                width={aboutPhoto.image.asset.metadata.dimensions.width}
              />
            </div>
          </div>
        )}
        <div class="prose prose-lg mx-auto fade-in-images">
          <p class="text-gray-700 leading-relaxed">
            Dana Gill is a Filipino engineer and hobby-artist based in Berlin.
            She shoots primarily with analog on a Minolta and Canon Pixma, but
            also enjoys shooting digitally. She enjoys capturing portraits and
            various moments from travels and life.
          </p>
          <p class="text-gray-700 mt-4 leading-relaxed">
            All photos on this site were shot on analog film unless stated
            otherwise.
          </p>
          <p class="text-gray-700 mt-4 leading-relaxed">
            For inquiries, please reach out via email at danougill [@]
            gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
});
