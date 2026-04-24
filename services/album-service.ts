import { createClient } from "@sanity/client";
import type { SanityAlbum, SanityPhoto } from "../types/sanity.ts";

const projectId = Deno.env.get("SANITY_PROJECT_ID") ?? "";
const dataset = Deno.env.get("SANITY_DATASET") ?? "production";
const apiToken = Deno.env.get("SANITY_API_TOKEN") ?? "";

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-03-14",
  token: apiToken,
  useCdn: false,
});

const IMAGE_PROJECTION =
  `image { asset->{ _id, url, metadata { dimensions, lqip } }, hotspot }`;

export const createAlbum = async (
  title: string,
  slug: string,
  description: string,
): Promise<SanityAlbum> => {
  const doc = await client.create({
    _type: "album",
    title,
    slug: { _type: "slug", current: slug },
    description: description || null,
  });

  return {
    _id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    description: doc.description ?? null,
  };
};

export const createPhoto = async (
  albumId: string,
  assetId: string,
  altTitle: string,
  caption: string,
  order: number,
): Promise<SanityPhoto> => {
  const doc = await client.create({
    _type: "photo",
    image: { _type: "image", asset: { _type: "reference", _ref: assetId } },
    altTitle: altTitle || null,
    caption: caption || null,
    order,
    album: { _type: "reference", _ref: albumId },
  });

  return fetchPhotoById(doc._id);
};

export const deleteAlbum = async (_id: string): Promise<void> => {
  await client.delete(_id);
};

export const deletePhoto = async (_id: string): Promise<void> => {
  await client.delete(_id);
};

export const fetchAlbumBySlug = async (
  slug: string,
): Promise<SanityAlbum | null> => {
  const doc = await client.fetch<
    {
      _id: string;
      title: string;
      slug: { current: string };
      description: string | null;
    } | null
  >(
    `*[_type == "album" && slug.current == $slug][0]{ _id, title, slug, description }`,
    { slug },
  );

  if (!doc) return null;

  return {
    _id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    description: doc.description ?? null,
  };
};

export const fetchAllAlbums = async (): Promise<ReadonlyArray<SanityAlbum>> => {
  const docs = await client.fetch<
    ReadonlyArray<{
      _id: string;
      title: string;
      slug: { current: string };
      description: string | null;
    }>
  >(
    `*[_type == "album"]{ _id, title, slug, description }`,
  );

  return docs.map((doc) => ({
    _id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    description: doc.description ?? null,
  }));
};

export const fetchPhotoById = async (_id: string): Promise<SanityPhoto> => {
  const doc = await client.fetch<{
    _id: string;
    image: SanityPhoto["image"];
    altTitle: string | null;
    caption: string | null;
    order: number;
    album: { _ref: string } | null;
  }>(
    `*[_type == "photo" && _id == $_id][0]{ _id, ${IMAGE_PROJECTION}, altTitle, caption, order, album }`,
    { _id },
  );

  return doc;
};

export const fetchCarouselPhotoIds = async (): Promise<
  ReadonlyArray<string>
> => {
  const doc = await client.fetch<{
    images: ReadonlyArray<{ _ref: string }> | null;
  } | null>(
    `*[_type == "carousel"][0]{ "images": images[]{ _ref } }`,
  );
  return doc?.images?.map((img) => img._ref) ?? [];
};

export const fetchPhotosByAlbum = async (
  albumId: string,
): Promise<ReadonlyArray<SanityPhoto>> => {
  return client.fetch<ReadonlyArray<SanityPhoto>>(
    `*[_type == "photo" && album._ref == $albumId] | order(order asc){ _id, ${IMAGE_PROJECTION}, altTitle, caption, order, album }`,
    { albumId },
  );
};

export const updateAlbum = async (
  _id: string,
  fields: { title?: string; description?: string },
): Promise<SanityAlbum> => {
  const patch = client.patch(_id);

  if (fields.title !== undefined) patch.set({ title: fields.title });
  if (fields.description !== undefined) {
    patch.set({ description: fields.description || null });
  }

  const doc = await patch.commit<{
    _id: string;
    title: string;
    slug: { current: string };
    description: string | null;
  }>();

  return {
    _id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    description: doc.description ?? null,
  };
};

export const updatePhotoOrder = async (
  _id: string,
  order: number,
): Promise<void> => {
  await client.patch(_id).set({ order }).commit();
};

export const uploadMediaFile = async (file: File): Promise<string> => {
  const asset = await client.assets.upload("image", file, {
    filename: file.name,
  });
  return asset._id;
};
