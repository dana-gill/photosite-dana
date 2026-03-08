import { define } from "../../../../../utils.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import { deleteAlbum, updateAlbum } from "../../../../../services/album-service.ts";
import { refreshAlbumCache } from "../../../../../services/image-service.ts";

interface UpdateAlbumBody {
  readonly description: string;
}

export const handler = define.handlers({
  PATCH: async (ctx) => {
    if (!isAdminAuthorized(ctx.req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "WWW-Authenticate": `Basic realm="Admin"`,
          "Content-Type": "application/json",
        },
      });
    }

    const { documentId } = ctx.params;
    const body: UpdateAlbumBody = await ctx.req.json();

    const album = await updateAlbum(documentId, body.description ?? "");
    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ data: album }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },

  DELETE: async (ctx) => {
    if (!isAdminAuthorized(ctx.req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "WWW-Authenticate": `Basic realm="Admin"`,
          "Content-Type": "application/json",
        },
      });
    }

    const { documentId } = ctx.params;

    await deleteAlbum(documentId);
    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
