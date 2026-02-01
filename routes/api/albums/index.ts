import type { Handlers } from "$fresh/server.ts";
import { getAllAlbums, getImagesByAlbum } from "../../../services/cache-manager.ts";

interface AlbumSummary {
  readonly name: string;
  readonly imageCount: number;
}

export const handler: Handlers = {
  GET: async (_req, _ctx) => {
    const albumNames = await getAllAlbums();

    const albumSummaries = await Promise.all(
      albumNames.map(async (name): Promise<AlbumSummary> => {
        const images = await getImagesByAlbum(name);
        return {
          name,
          imageCount: images?.length ?? 0,
        };
      })
    );

    return new Response(JSON.stringify(albumSummaries), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
