import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { fetchAllAlbums } from "../../services/album-service.ts";
import { getPhotosByAlbumSlug } from "../../services/cache-manager.ts";
import CreateAlbumForm from "../../islands/CreateAlbumForm.tsx";
import DeleteAlbumButton from "../../islands/DeleteAlbumButton.tsx";

interface AlbumRow {
  readonly documentId: string;
  readonly slug: string;
  readonly title: string;
  readonly photoCount: number;
}

export const handler = define.handlers({
  GET: async (ctx) => {
    const albums = await fetchAllAlbums();

    const rows = await Promise.all(
      albums.map(async (album): Promise<AlbumRow> => {
        const photos = await getPhotosByAlbumSlug(ctx.state.kv, album.slug);
        return {
          documentId: album.documentId,
          slug: album.slug,
          title: album.title,
          photoCount: photos?.length ?? 0,
        };
      }),
    );

    return { data: rows };
  },
});

export default define.page<typeof handler>(function AdminIndex({ data }) {
  const rows = data;

  return (
    <div>
      <Head>
        <title>Admin - Dana Gill Photography</title>
      </Head>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Albums</h1>
        <a href="/admin/carousel" class="text-sm text-gray-500 hover:text-gray-900">Carousel Editor →</a>
      </div>
      {rows.length === 0 && (
        <p class="text-gray-500">No albums found. Create one in Strapi first.</p>
      )}
      <ul class="divide-y divide-gray-200 bg-white rounded border border-gray-200">
        {rows.map((row) => (
          <li key={row.documentId} class="flex items-center justify-between px-4 py-3">
            <div>
              <a
                href={`/admin/albums/${row.documentId}`}
                class="font-medium text-gray-900 hover:underline"
              >
                {row.title}
              </a>
              <span class="ml-2 text-sm text-gray-500">/{row.slug}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-500">{row.photoCount} photos</span>
              <DeleteAlbumButton documentId={row.documentId} title={row.title} />
            </div>
          </li>
        ))}
      </ul>
      <CreateAlbumForm />
    </div>
  );
});
