import { fetchAllAlbums, fetchPhotosByAlbum } from "./album-service.ts";
import { clearAlbumCache, saveAllAlbumPhotos } from "./cache-manager.ts";

export const refreshAlbumCache = async (kv: Deno.Kv): Promise<void> => {
  await clearAlbumCache(kv);

  const albums = await fetchAllAlbums();

  const albumPhotosEntries = await Promise.all(
    albums.map(async (album) => {
      const photos = await fetchPhotosByAlbum(album._id);
      return [album.slug, { album, photos }] as const;
    }),
  );

  const albumPhotosMap = new Map(albumPhotosEntries);
  await saveAllAlbumPhotos(kv, albumPhotosMap);
};
