import { refreshCache } from "../../../services/image-service.ts";
import { getCacheMetadata } from "../../../services/cache-manager.ts";

const PHOTOSITE_TOKEN = Deno.env.get("PHOTOSITE_TOKEN") ?? "";

export const handler = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      error: "Method not allowed",
    }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token !== PHOTOSITE_TOKEN || !PHOTOSITE_TOKEN) {
    return new Response(JSON.stringify({
      success: false,
      error: "Unauthorized",
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await refreshCache();
    const metadata = await getCacheMetadata();

    return new Response(JSON.stringify({
      success: true,
      metadata,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
