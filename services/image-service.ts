import type { AlbumImages, StrapiImage } from "../types/strapi.ts";
import { saveAllAlbums } from "./cache-manager.ts";

const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";
const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";

export const extractAlbumPrefix = (filename: string): string => {
  const parts = filename.split("_");
  return parts[0] ?? filename;
};

export const extractNumericSuffix = (filename: string): number => {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const parts = withoutExtension.split("_");
  const lastPart = parts[parts.length - 1];
  const numericValue = lastPart ? parseInt(lastPart, 10) : 0;
  return isNaN(numericValue) ? 0 : numericValue;
};

const normalizeUrl = (url: string): string => {
  const isRelativeUrl = url.startsWith("/");
  return isRelativeUrl ? `${STRAPI_URL}${url}` : url;
};

const normalizeImageUrl = (image: StrapiImage): StrapiImage => {
  const normalizedFormats = image.formats
    ? {
      thumbnail: image.formats.thumbnail
        ? {
          ...image.formats.thumbnail,
          url: normalizeUrl(image.formats.thumbnail.url),
        }
        : undefined,
      small: image.formats.small
        ? {
          ...image.formats.small,
          url: normalizeUrl(image.formats.small.url),
        }
        : undefined,
      medium: image.formats.medium
        ? {
          ...image.formats.medium,
          url: normalizeUrl(image.formats.medium.url),
        }
        : undefined,
      large: image.formats.large
        ? {
          ...image.formats.large,
          url: normalizeUrl(image.formats.large.url),
        }
        : undefined,
    }
    : null;

  return {
    ...image,
    url: normalizeUrl(image.url),
    formats: normalizedFormats,
  };
};

export const fetchAllImagesFromStrapi = async (): Promise<ReadonlyArray<StrapiImage>> => {
  const url = `${STRAPI_URL}api/upload/files`;
  console.log(`Fetching images from Strapi: ${url}`);

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

  const normalizedImages = data.map(normalizeImageUrl);
  console.log(`Successfully fetched ${normalizedImages.length} images from Strapi`);
  console.log(`Sample image URL: ${normalizedImages[0]?.url}`);
  return normalizedImages;
};

export const groupImagesByAlbum = (images: ReadonlyArray<StrapiImage>): AlbumImages => {
  const albumsMap = new Map<string, StrapiImage[]>();

  images.forEach((image) => {
    const albumPrefix = extractAlbumPrefix(image.name);
    const existingImages = albumsMap.get(albumPrefix) ?? [];
    albumsMap.set(albumPrefix, [...existingImages, image]);
  });

  return new Map(
    Array.from(albumsMap.entries()).map(([key, value]) => [
      key,
      sortImagesByNumericSuffix(value)
    ])
  );
};

export const sortImagesByNumericSuffix = (images: ReadonlyArray<StrapiImage>): ReadonlyArray<StrapiImage> => {
  return [...images].sort((a, b) => {
    const numA = extractNumericSuffix(a.name);
    const numB = extractNumericSuffix(b.name);
    return numA - numB;
  });
};

export const refreshCache = async (kv: Deno.Kv): Promise<void> => {
  const images = await fetchAllImagesFromStrapi();
  const albumsMap = groupImagesByAlbum(images);
  console.log(`Grouped ${images.length} images into ${albumsMap.size} albums:`, Array.from(albumsMap.keys()));
  await saveAllAlbums(kv, albumsMap);
  console.log("Successfully saved all albums to cache");
};
