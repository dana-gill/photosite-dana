import { define, type WorkPreview } from "../../utils.ts";
import {
  getAllAlbumSlugs,
  getPhotosByAlbumSlug,
} from "../../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const slugs = await getAllAlbumSlugs(ctx.state.kv);

    const previewPromises = slugs.map(
      async (slug): Promise<WorkPreview | null> => {
        const photos = await getPhotosByAlbumSlug(ctx.state.kv, slug);
        const firstPhoto = photos?.[0];
        if (!firstPhoto || !firstPhoto.image?.asset?.metadata) return null;

        return {
          href: `/work/${slug}`,
          imageUrl: firstPhoto.image.asset.url,
          width: firstPhoto.image.asset.metadata.dimensions.width,
          height: firstPhoto.image.asset.metadata.dimensions.height,
        };
      },
    );

    const results = await Promise.all(previewPromises);
    const previews = results.filter((p): p is WorkPreview => p !== null);

    return new Response(JSON.stringify(previews), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
