import { define } from "../../../../../utils.ts";
import { isCategory } from "../../../../../types/category.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import {
  fetchPhotosByCategory,
  setCategoryOrder,
} from "../../../../../services/photo-service.ts";
import { refreshCategory } from "../../../../../services/image-service.ts";

interface ReorderBody {
  readonly photoIds: ReadonlyArray<string>;
}

const isReorderBody = (value: unknown): value is ReorderBody =>
  typeof value === "object" && value !== null &&
  "photoIds" in value && Array.isArray(value.photoIds) &&
  value.photoIds.every((id: unknown) => typeof id === "string");

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
    const { photoIds } = raw;

    const currentIds = (await fetchPhotosByCategory(category)).map((p) =>
      p._id
    );
    const requested = new Set(photoIds);
    const isSameSet = currentIds.length === photoIds.length &&
      requested.size === photoIds.length &&
      currentIds.every((id) => requested.has(id));
    if (!isSameSet) return jsonError("Reload the page", 409);

    await setCategoryOrder(photoIds);
    await refreshCategory(ctx.state.kv, category);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
