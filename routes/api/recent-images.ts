import { define } from "../../utils.ts";
import { getAllAlbumSlugs, getPhotosByAlbumSlug } from "../../services/cache-manager.ts";
import type { SanityPhoto } from "../../types/sanity.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const slugs = await getAllAlbumSlugs(ctx.state.kv);
    const photoArrays = await Promise.all(slugs.map((slug) => getPhotosByAlbumSlug(ctx.state.kv, slug)));
    const allPhotos = photoArrays.flatMap((photos) => photos ?? []);

    const randomPhotos: ReadonlyArray<SanityPhoto> = [...allPhotos]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    return new Response(JSON.stringify(randomPhotos), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
