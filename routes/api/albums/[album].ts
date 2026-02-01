import type { Handlers } from "$fresh/server.ts";
import { getImagesByAlbum } from "../../../services/cache-manager.ts";

export const handler: Handlers = {
  GET: async (_req, ctx) => {
    const albumName = ctx.params.album;
    const images = await getImagesByAlbum(albumName);

    if (!images) {
      return new Response(JSON.stringify({ error: "Album not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(images), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
