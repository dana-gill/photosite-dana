import type { SanityAlbum, SanityPhoto } from "../../../types/sanity.ts";
import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { fetchAllAlbums, fetchPhotosByAlbum } from "../../../services/album-service.ts";
import AlbumPhotoSorter from "../../../islands/AlbumPhotoSorter.tsx";
import EditAlbumFields from "../../../islands/EditAlbumFields.tsx";
import PhotoUploader from "../../../islands/PhotoUploader.tsx";

interface AlbumEditorData {
  readonly album: SanityAlbum;
  readonly photos: ReadonlyArray<SanityPhoto>;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const albumId = ctx.params.documentId;
    const albums = await fetchAllAlbums();
    const album = albums.find((a) => a._id === albumId) ?? null;

    if (!album) {
      return new Response("Not Found", { status: 404 });
    }

    const photos = await fetchPhotosByAlbum(albumId);

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
        <EditAlbumFields
          albumId={album._id}
          initialTitle={album.title}
          initialDescription={album.description}
        />
        <p class="text-sm text-gray-400 mt-1">slug: {album.slug}</p>
      </div>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Photos ({photos.length})</h2>
        <p class="text-sm text-gray-500">Drag to reorder, then save.</p>
      </div>
      <AlbumPhotoSorter albumId={album._id} photos={photos} />
      <PhotoUploader albumId={album._id} />
    </div>
  );
});
