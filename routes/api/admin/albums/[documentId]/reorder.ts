import { define } from "../../../../../utils.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import { refreshAlbumCache } from "../../../../../services/image-service.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_FULL_ADMIN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

interface PhotoOrderEntry {
  readonly documentId: string;
  readonly order: number;
}

interface ReorderBody {
  readonly photos: ReadonlyArray<PhotoOrderEntry>;
}

const updatePhotoOrder = async (entry: PhotoOrderEntry): Promise<void> => {
  const url = `${STRAPI_URL}api/photos/${entry.documentId}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { order: entry.order } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update photo ${entry.documentId}: ${errorText}`);
  }
};

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

    await Promise.all(body.photos.map(updatePhotoOrder));
    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
