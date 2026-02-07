import { clearCache, getCacheMetadata } from "../../../services/cache-manager.ts";
import { refreshCache } from "../../../services/image-service.ts";
import { define } from "../../../utils.ts";

const PHOTOSITE_TOKEN = Deno.env.get("PHOTOSITE_TOKEN") ?? "";

export const handler = define.handlers({
  POST: async (ctx) => {
    const authHeader = ctx.req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== PHOTOSITE_TOKEN || !PHOTOSITE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const kv = ctx.state.kv;

      await clearCache(kv);
      console.log("Cache cleared successfully");

      await refreshCache(kv);
      console.log("Cache refreshed successfully");

      const metadata = await getCacheMetadata(kv);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Cache cleared and refreshed successfully",
          metadata: {
            lastRefresh: metadata?.lastRefresh,
            totalImages: metadata?.totalImages,
            albumCount: metadata?.albumCount,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error refreshing cache:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to refresh cache",
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
