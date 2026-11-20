import { define } from "../../utils.ts";
import { getPhotosByCategory } from "../../services/cache-manager.ts";
import { CATEGORIES } from "../../types/category.ts";
import type { SanityPhoto } from "../../types/sanity.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const photoArrays = await Promise.all(
      CATEGORIES.map((category) => getPhotosByCategory(ctx.state.kv, category)),
    );
    const allPhotos = photoArrays.flat();

    const randomPhotos: ReadonlyArray<SanityPhoto> = [...allPhotos]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    return new Response(JSON.stringify(randomPhotos), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
