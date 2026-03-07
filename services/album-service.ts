import type { StrapiAlbum, StrapiAlbumResponse, StrapiPhoto, StrapiPhotoResponse } from "../types/album.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

export const fetchAlbumBySlug = async (slug: string): Promise<StrapiAlbum | null> => {
  const url = `${STRAPI_URL}api/albums?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to fetch album by slug from Strapi: ${response.statusText}`);
  }

  const data: StrapiAlbumResponse = await response.json();
  return data.data[0] ?? null;
};

export const fetchAllAlbums = async (): Promise<ReadonlyArray<StrapiAlbum>> => {
  const url = `${STRAPI_URL}api/albums?populate=*`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to fetch albums from Strapi: ${response.statusText}`);
  }

  const data: StrapiAlbumResponse = await response.json();
  return data.data;
};

export const fetchPhotosByAlbum = async (albumDocumentId: string): Promise<ReadonlyArray<StrapiPhoto>> => {
  const url = `${STRAPI_URL}api/photos?filters[album][documentId][$eq]=${encodeURIComponent(albumDocumentId)}&populate=image&sort=order:asc&pagination[pageSize]=100`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to fetch photos from Strapi: ${response.statusText}`);
  }

  const data: StrapiPhotoResponse = await response.json();
  return data.data;
};
