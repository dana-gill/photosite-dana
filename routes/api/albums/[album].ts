import type { Handlers } from "$fresh/server.ts";
import { getImagesByAlbum } from "../../../services/cache-manager.ts";

const PHOTOSITE_TOKEN = Deno.env.get("PHOTOSITE_TOKEN") ?? "";

export const handler: Handlers = {
  GET: async (ctx) => {
    const authHeader = ctx.req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== PHOTOSITE_TOKEN || !PHOTOSITE_TOKEN) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
