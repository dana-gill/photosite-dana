import { define } from "../../../../../utils.ts";
import { isCategory } from "../../../../../types/category.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import { updatePhotoOrder } from "../../../../../services/photo-service.ts";
import { refreshCategory } from "../../../../../services/image-service.ts";

interface PhotoOrderEntry {
  readonly _id: string;
  readonly order: number;
}

interface ReorderBody {
  readonly photos: ReadonlyArray<PhotoOrderEntry>;
}

const isPhotoOrderEntry = (value: unknown): value is PhotoOrderEntry =>
  typeof value === "object" && value !== null &&
  "_id" in value && typeof value._id === "string" &&
  "order" in value && typeof value.order === "number";

const isReorderBody = (value: unknown): value is ReorderBody =>
  typeof value === "object" && value !== null &&
  "photos" in value && Array.isArray(value.photos) &&
  value.photos.every(isPhotoOrderEntry);

const jsonError = (error: string, status: number): Response =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

    const category = ctx.params.category;
    if (!isCategory(category)) return jsonError("Invalid category", 400);

    const raw: unknown = await ctx.req.json().catch(() => null);
    if (!isReorderBody(raw)) return jsonError("Invalid body", 400);

    await Promise.all(
      raw.photos.map((entry) => updatePhotoOrder(entry._id, entry.order)),
    );
    await refreshCategory(ctx.state.kv, category);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
