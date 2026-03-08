import type { StrapiPhoto } from "../../types/album.ts";
import { Head } from "fresh/runtime";
import { Image } from "../../components/Image.tsx";
import { PageHeader } from "../../components/PageHeader.tsx";
import { define } from "../../utils.ts";
import { getAlbumBySlug, getPhotosByAlbumSlug } from "../../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const slug = ctx.params.slug;
    const [album, photos] = await Promise.all([
      getAlbumBySlug(ctx.state.kv, slug),
      getPhotosByAlbumSlug(ctx.state.kv, slug),
    ]);

    if (!album) {
      return new Response("Not Found", { status: 404 });
    }

    return { data: { album, photos: photos ?? [] } };
  },
});

export default define.page<typeof handler>(function AlbumPage({ data }) {
  const { album, photos } = data;

  return (
    <div class="px-4 py-8 mx-auto md:min-h-screen bg-gray-50">
      <Head>
        <title>{album.title} - Dana Gill Photography</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <PageHeader
          title={album.title}
          subtitle={album.description ?? ""}
        />
        <div class="flex flex-wrap justify-evenly gap-6 items-center">
          {photos.map((photo: StrapiPhoto) => (
            <div key={photo.id} class="overflow-hidden max-w-lg fade-in-images">
              <Image
                alt={photo.altTitle ?? photo.caption ?? photo.image.alternativeText ?? photo.image.name}
                formats={photo.image.formats}
                height={photo.image.height}
                src={photo.image.url}
                width={photo.image.width}
              />
              {photo.caption && (
                <div class="p-4">
                  <p class="text-sm text-gray-600">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {photos.length === 0 && (
          <p class="text-center text-gray-500 mt-8">No images found</p>
        )}
      </div>
    </div>
  );
});
