import { define } from "../../../../utils.ts";
import { isAdminAuthorized } from "../../../../services/admin-auth-service.ts";
import { saveCarouselEntries } from "../../../../services/cache-manager.ts";
import {
  fetchExistingPhotoIds,
  saveCarousel,
} from "../../../../services/photo-service.ts";
import type { CarouselEntry } from "../../../../types/sanity.ts";

interface SaveCarouselBody {
  readonly entries: ReadonlyArray<CarouselEntry>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCarouselEntry = (value: unknown): value is CarouselEntry =>
  isRecord(value) && typeof value.photoId === "string";

const isSaveCarouselBody = (value: unknown): value is SaveCarouselBody =>
  isRecord(value) && Array.isArray(value.entries) &&
  value.entries.every(isCarouselEntry);

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
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

    const raw = await ctx.req.json().then(
      (value: unknown) => ({ ok: true as const, value }),
      () => ({ ok: false as const }),
    );
    if (!raw.ok) return jsonResponse({ error: "Invalid JSON" }, 400);
    if (!isSaveCarouselBody(raw.value)) {
      return jsonResponse({ error: "Invalid body" }, 400);
    }

    const { entries } = raw.value;
    const ids = entries.map((entry) => entry.photoId);
    if (new Set(ids).size < ids.length) {
      return jsonResponse({ error: "Duplicate photo ids" }, 400);
    }

    const existing = new Set(await fetchExistingPhotoIds(ids));
    const missing = ids.filter((id) => !existing.has(id));
    if (missing.length > 0) {
      return jsonResponse({ error: "Unknown photo ids", missing }, 400);
    }

    await saveCarousel(ids);
    await saveCarouselEntries(ctx.state.kv, entries);

    return jsonResponse({ success: true }, 200);
  },
});
