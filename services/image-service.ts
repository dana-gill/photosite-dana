import type { AlbumImages, StrapiImage } from "../types/strapi.ts";
import { saveAllAlbums } from "./cache-manager.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

export const extractAlbumPrefix = (filename: string): string => {
  const parts = filename.split("_");
  return parts[0] ?? filename;
};

export const fetchAllImagesFromStrapi = async (): Promise<ReadonlyArray<StrapiImage>> => {
  const url = `${STRAPI_URL}api/upload/files`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const isSuccess = response.ok;

  if (!isSuccess) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to fetch images from Strapi: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    console.error("Invalid Strapi response structure:", JSON.stringify(data, null, 2));
    throw new Error(
      `Strapi API returned unexpected structure. Expected an array but response was: ${JSON.stringify(data).substring(0, 200)}`
    );
  }

  return data;
};

export const groupImagesByAlbum = (images: ReadonlyArray<StrapiImage>): AlbumImages => {
  const albumsMap = new Map<string, StrapiImage[]>();

  images.forEach((image) => {
    const albumPrefix = extractAlbumPrefix(image.name);
    const existingImages = albumsMap.get(albumPrefix) ?? [];
    albumsMap.set(albumPrefix, [...existingImages, image]);
  });

  return new Map(
    Array.from(albumsMap.entries()).map(([key, value]) => [key, value as ReadonlyArray<StrapiImage>])
  );
};

export const refreshCache = async (): Promise<void> => {
  const images = await fetchAllImagesFromStrapi();
  const albumsMap = groupImagesByAlbum(images);
  await saveAllAlbums(albumsMap);
};
