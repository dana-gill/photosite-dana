import type { AlbumImages, StrapiFileResponse, StrapiImage } from "../types/strapi.ts";
import { saveAllAlbums } from "./cache-manager.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

export const extractAlbumPrefix = (filename: string): string => {
  const parts = filename.split("_");
  return parts[0] ?? filename;
};

const fetchPageFromStrapi = async (page: number, pageSize: number): Promise<StrapiFileResponse> => {
  const url = `${STRAPI_URL}api/upload/files?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const isSuccess = response.ok;

  if (!isSuccess) {
    throw new Error(`Failed to fetch images from Strapi: ${response.statusText}`);
  }

  return await response.json();
};

export const fetchAllImagesFromStrapi = async (): Promise<ReadonlyArray<StrapiImage>> => {
  const pageSize = 100;
  const firstPage = await fetchPageFromStrapi(1, pageSize);
  const totalPages = firstPage.meta.pagination.pageCount;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const allPages = await Promise.all(
    pageNumbers.map((page) => fetchPageFromStrapi(page, pageSize))
  );

  return allPages.flatMap((pageData) => pageData.data);
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
