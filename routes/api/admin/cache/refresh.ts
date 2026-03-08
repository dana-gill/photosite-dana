import { define } from "../../../../utils.ts";
import { isAdminAuthorized } from "../../../../services/admin-auth-service.ts";
import { refreshAlbumCache } from "../../../../services/image-service.ts";

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

    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
