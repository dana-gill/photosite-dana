import type { StrapiAlbum, StrapiPhoto } from "../../../types/album.ts";
import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { fetchAllAlbums, fetchPhotosByAlbum } from "../../../services/album-service.ts";
import AlbumPhotoSorter from "../../../islands/AlbumPhotoSorter.tsx";
import PhotoUploader from "../../../islands/PhotoUploader.tsx";

interface AlbumEditorData {
  readonly album: StrapiAlbum;
  readonly photos: ReadonlyArray<StrapiPhoto>;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const documentId = ctx.params.documentId;
    const albums = await fetchAllAlbums();
    const album = albums.find((a) => a.documentId === documentId) ?? null;

    if (!album) {
      return new Response("Not Found", { status: 404 });
    }

    const photos = await fetchPhotosByAlbum(documentId);

    return { data: { album, photos } satisfies AlbumEditorData };
  },
});

export default define.page<typeof handler>(function AlbumEditor({ data }) {
  const { album, photos } = data;

  return (
    <div>
      <Head>
        <title>{album.title} - Admin</title>
      </Head>
      <div class="mb-6">
        <a href="/admin" class="text-sm text-gray-500 hover:text-gray-900">← Albums</a>
        <h1 class="text-2xl font-semibold text-gray-900 mt-2">{album.title}</h1>
        {album.description && (
          <p class="text-gray-500 mt-1">{album.description}</p>
        )}
        <p class="text-sm text-gray-400 mt-1">slug: {album.slug}</p>
      </div>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Photos ({photos.length})</h2>
        <p class="text-sm text-gray-500">Drag to reorder, then save.</p>
      </div>
      <AlbumPhotoSorter albumDocumentId={album.documentId} photos={photos} />
      <PhotoUploader albumDocumentId={album.documentId} />
    </div>
  );
});
