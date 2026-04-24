import { define } from "../../../../utils.ts";
import { isAdminAuthorized } from "../../../../services/admin-auth-service.ts";
import { saveCarouselEntries } from "../../../../services/cache-manager.ts";
import type { CarouselEntry } from "../../../../types/sanity.ts";

interface SaveCarouselBody {
  readonly entries: ReadonlyArray<CarouselEntry>;
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

    const body: SaveCarouselBody = await ctx.req.json();
    await saveCarouselEntries(ctx.state.kv, body.entries);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
