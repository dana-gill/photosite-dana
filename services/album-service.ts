import type { StrapiAlbum, StrapiAlbumResponse, StrapiAlbumSingleResponse, StrapiPhoto, StrapiPhotoResponse, StrapiPhotoSingleResponse } from "../types/album.ts";
import type { StrapiImage } from "../types/strapi.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";
const STRAPI_API_FULL_ADMIN = Deno.env.get("STRAPI_API_FULL_ADMIN") ?? "";
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

export const deleteAlbum = async (documentId: string): Promise<void> => {
  const url = `${STRAPI_URL}api/albums/${documentId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${STRAPI_API_FULL_ADMIN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to delete album from Strapi: ${response.statusText}`);
  }
};

export const createAlbum = async (title: string, slug: string, description: string): Promise<StrapiAlbum> => {
  const url = `${STRAPI_URL}api/albums`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRAPI_API_FULL_ADMIN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { title, slug, description } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to create album in Strapi: ${response.statusText}`);
  }

  const data: StrapiAlbumSingleResponse = await response.json();
  return data.data;
};

export const createPhoto = async (
  albumDocumentId: string,
  imageId: number,
  altTitle: string,
  caption: string,
  order: number,
): Promise<StrapiPhoto> => {
  const url = `${STRAPI_URL}api/photos`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRAPI_API_FULL_ADMIN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { album: albumDocumentId, image: imageId, altTitle, caption, order } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to create photo in Strapi: ${response.statusText}`);
  }

  const data: StrapiPhotoSingleResponse = await response.json();
  return data.data;
};

export const uploadMediaFile = async (file: File): Promise<StrapiImage> => {
  const url = `${STRAPI_URL}api/upload`;

  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRAPI_API_FULL_ADMIN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error (${response.status}):`, errorText);
    throw new Error(`Failed to upload file to Strapi: ${response.statusText}`);
  }

  const data: ReadonlyArray<StrapiImage> = await response.json();
  const uploaded = data[0];
  if (!uploaded) {
    throw new Error("Strapi upload returned no files");
  }
  return uploaded;
};
