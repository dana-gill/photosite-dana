import {
  fetchAllAlbums,
  fetchCarouselPhotoIds,
  fetchPhotosByAlbum,
} from "./album-service.ts";
import {
  clearAlbumCache,
  saveAllAlbumPhotos,
  saveCarouselEntries,
} from "./cache-manager.ts";

export const refreshAlbumCache = async (kv: Deno.Kv): Promise<void> => {
  await clearAlbumCache(kv);

  const [albums, carouselPhotoIds] = await Promise.all([
    fetchAllAlbums(),
    fetchCarouselPhotoIds(),
  ]);

  const albumPhotosEntries = await Promise.all(
    albums.map(async (album) => {
      const photos = await fetchPhotosByAlbum(album._id);
      return [album.slug, { album, photos }] as const;
    }),
  );

  const albumPhotosMap = new Map(albumPhotosEntries);

  await Promise.all([
    saveAllAlbumPhotos(kv, albumPhotosMap),
    saveCarouselEntries(
      kv,
      carouselPhotoIds.map((photoId) => ({ photoId })),
    ),
  ]);
};
