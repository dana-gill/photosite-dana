import { define } from "../../../../utils.ts";
import { isAdminAuthorized } from "../../../../services/admin-auth-service.ts";
import { createAlbum } from "../../../../services/album-service.ts";

interface CreateAlbumBody {
  readonly title: string;
  readonly slug: string;
  readonly description: string;
}

export const handler = define.handlers({
  POST: async (ctx) => {
    if (!isAdminAuthorized(ctx.req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "WWW-Authenticate": `Basic realm="Admin"`,
          "Content-Type": "application/json",
        },
      });
    }

    const body: CreateAlbumBody = await ctx.req.json();

    if (!body.title || !body.slug) {
      return new Response(JSON.stringify({ error: "title and slug are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const album = await createAlbum(body.title, body.slug, body.description ?? "");

    return new Response(JSON.stringify({ data: album }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});
