import { define } from "../../utils.ts";
import { getAllImages } from "../../services/cache-manager.ts";
import type { StrapiImage } from "../../types/strapi.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const allImages = await getAllImages(ctx.state.kv);

    const shuffledImages = [...allImages].filter(image => !image.name.includes("about")).sort(() => Math.random() - 0.5);

    const randomImages: ReadonlyArray<StrapiImage> = shuffledImages.slice(0, 10);

    return new Response(JSON.stringify(randomImages), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
