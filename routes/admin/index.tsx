import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { fetchAllAlbums } from "../../services/album-service.ts";
import { getPhotosByAlbumSlug } from "../../services/cache-manager.ts";
import CreateAlbumForm from "../../islands/CreateAlbumForm.tsx";

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
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Albums</h1>
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
            <span class="text-sm text-gray-500">{row.photoCount} photos</span>
          </li>
        ))}
      </ul>
      <CreateAlbumForm />
    </div>
  );
});
