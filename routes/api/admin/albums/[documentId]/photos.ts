import { define } from "../../../../../utils.ts";
import { isAdminAuthorized } from "../../../../../services/admin-auth-service.ts";
import {
  createPhoto,
  deletePhoto,
  fetchPhotosByAlbum,
  uploadMediaFile,
} from "../../../../../services/album-service.ts";
import { refreshAlbumCache } from "../../../../../services/image-service.ts";

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

    const albumId = ctx.params.documentId;
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

    const existingPhotos = await fetchPhotosByAlbum(albumId);
    const nextOrder = existingPhotos.length;

    const assetId = await uploadMediaFile(file);
    const photo = await createPhoto(
      albumId,
      assetId,
      typeof altTitle === "string" ? altTitle : "",
      typeof caption === "string" ? caption : "",
      nextOrder,
    );

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
    await refreshAlbumCache(ctx.state.kv);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
