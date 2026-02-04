import { define } from "../../../utils.ts";
import {
  getAllAlbums,
  getImagesByAlbum,
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
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const albumNames = await getAllAlbums(ctx.state.kv);

    const albumSummaries = await Promise.all(
      albumNames.map(async (name): Promise<AlbumSummary> => {
        const images = await getImagesByAlbum(ctx.state.kv, name);
        return {
          name,
          imageCount: images?.length ?? 0,
        };
      }),
    );

    return new Response(JSON.stringify(albumSummaries), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
