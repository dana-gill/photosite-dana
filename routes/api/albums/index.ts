import { define } from "../../../utils.ts";
import {
  getAllAlbumSlugs,
  getPhotosByAlbumSlug,
} from "../../../services/cache-manager.ts";

const PHOTOSITE_TOKEN = Deno.env.get("PHOTOSITE_TOKEN") ?? "";

interface AlbumSummary {
  readonly name: string;
  readonly imageCount: number;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const authHeader = ctx.req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== PHOTOSITE_TOKEN || !PHOTOSITE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const slugs = await getAllAlbumSlugs(ctx.state.kv);

    const albumSummaries = await Promise.all(
      slugs.map(async (slug): Promise<AlbumSummary> => {
        const photos = await getPhotosByAlbumSlug(ctx.state.kv, slug);
        return {
          name: slug,
          imageCount: photos?.length ?? 0,
        };
      }),
    );

    return new Response(JSON.stringify(albumSummaries), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
