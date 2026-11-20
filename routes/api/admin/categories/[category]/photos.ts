import { define } from "../../../../../utils.ts";
import { isCategory } from "../../../../../types/category.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import {
  createPhoto,
  deletePhoto,
  uploadMediaFile,
} from "../../../../../services/photo-service.ts";
import {
  refreshCarousel,
  refreshCategory,
} from "../../../../../services/image-service.ts";

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
    if (!isCategory(category)) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await ctx.req.formData();
    const file = formData.get("file");
    const altTitle = formData.get("altTitle");
    const caption = formData.get("caption");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const assetId = await uploadMediaFile(file);
    const photo = await createPhoto(
      category,
      assetId,
      typeof altTitle === "string" ? altTitle : "",
      typeof caption === "string" ? caption : "",
    );
    await refreshCategory(ctx.state.kv, category);

    return new Response(JSON.stringify({ data: photo }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },

  DELETE: async (ctx) => {
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
    if (!isCategory(category)) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(ctx.req.url);
    const photoId = url.searchParams.get("photoDocumentId");

    if (!photoId) {
      return new Response(
        JSON.stringify({ error: "photoDocumentId is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await deletePhoto(photoId);
    await Promise.all([
      refreshCategory(ctx.state.kv, category),
      refreshCarousel(ctx.state.kv),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
