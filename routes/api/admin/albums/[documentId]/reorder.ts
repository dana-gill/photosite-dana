import { define } from "../../../../../utils.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import { updatePhotoOrder } from "../../../../../services/album-service.ts";
import { refreshAlbumCache } from "../../../../../services/image-service.ts";

interface PhotoOrderEntry {
  readonly _id: string;
  readonly order: number;
}

interface ReorderBody {
  readonly photos: ReadonlyArray<PhotoOrderEntry>;
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

    const body: ReorderBody = await ctx.req.json();

    await Promise.all(
      body.photos.map((entry) => updatePhotoOrder(entry._id, entry.order)),
    );
    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
