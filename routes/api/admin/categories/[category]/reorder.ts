import { define } from "../../../../../utils.ts";
import { isCategory } from "../../../../../types/category.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import {
  fetchPhotosByCategory,
  isSafePhotoId,
  saveCategoryChanges,
} from "../../../../../services/photo-service.ts";
import {
  refreshCarousel,
  refreshCategory,
} from "../../../../../services/image-service.ts";

interface ReorderBody {
  readonly photoIds: ReadonlyArray<string>;
  readonly deleteIds?: ReadonlyArray<string>;
}

const isIdArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) &&
  value.every((id: unknown) => typeof id === "string" && isSafePhotoId(id));

const isReorderBody = (value: unknown): value is ReorderBody =>
  typeof value === "object" && value !== null &&
  "photoIds" in value && isIdArray(value.photoIds) &&
  (("deleteIds" in value) ? isIdArray(value.deleteIds) : true);

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
    const { photoIds, deleteIds = [] } = raw;

    const currentPhotos = await fetchPhotosByCategory(category);
    const requested = new Set([...photoIds, ...deleteIds]);
    const requestedCount = photoIds.length + deleteIds.length;
    const isSameSet = currentPhotos.length === requestedCount &&
      requested.size === requestedCount &&
      currentPhotos.every((photo) => requested.has(photo._id));
    if (!isSameSet) return jsonError("Reload the page", 409);

    await saveCategoryChanges(currentPhotos, photoIds, deleteIds);
    await Promise.all([
      refreshCategory(ctx.state.kv, category),
      deleteIds.length > 0 ? refreshCarousel(ctx.state.kv) : Promise.resolve(),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
