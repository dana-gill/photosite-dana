import { Buffer } from "node:buffer";
import { createClient } from "@sanity/client";
import type { Category } from "../types/category.ts";
import type { SanityAbout, SanityPhoto } from "../types/sanity.ts";

const getClient = () => {
  const projectId = Deno.env.get("SANITY_PROJECT_ID");
  const apiToken = Deno.env.get("SANITY_API_TOKEN");

  if (!projectId) throw new Error("SANITY_PROJECT_ID env var is not set");
  if (!apiToken) throw new Error("SANITY_API_TOKEN env var is not set");

  return createClient({
    projectId,
    dataset: Deno.env.get("SANITY_DATASET") ?? "production",
    apiVersion: "2026-03-14",
    token: apiToken,
    useCdn: false,
  });
};

const IMAGE_PROJECTION =
  `image { asset->{ _id, url, metadata { dimensions, lqip } }, hotspot }`;

const PHOTO_PROJECTION =
  `_id, ${IMAGE_PROJECTION}, altTitle, caption, order, category`;

export const createPhoto = async (
  category: Category,
  assetId: string,
  altTitle: string,
  caption: string,
): Promise<SanityPhoto> => {
  const client = getClient();
  const maxOrder = await client.fetch<number>(
    `coalesce(*[_type == "photo" && category == $category] | order(order desc)[0].order, 0)`,
    { category },
  );

  const doc = await client.create({
    _type: "photo",
    image: { _type: "image", asset: { _type: "reference", _ref: assetId } },
    category,
    altTitle: altTitle || null,
    caption: caption || null,
    order: maxOrder + 1,
  });

  const photo = await fetchPhotoById(doc._id);
  if (photo === null) {
    throw new Error(`Photo ${doc._id} not found after create`);
  }
  return photo;
};

export const deletePhoto = async (_id: string): Promise<void> => {
  await getClient().delete(_id);
};

export const fetchPhotoById = (_id: string): Promise<SanityPhoto | null> =>
  getClient().fetch<SanityPhoto | null>(
    `*[_type == "photo" && _id == $_id][0]{ ${PHOTO_PROJECTION} }`,
    { _id },
  );

export const fetchCarouselPhotoIds = async (): Promise<
  ReadonlyArray<string>
> => {
  const doc = await getClient().fetch<
    {
      images: ReadonlyArray<{ _ref: string }> | null;
    } | null
  >(
    `*[_type == "carousel"][0]{ "images": images[]{ _ref } }`,
  );
  return doc?.images?.map((img) => img._ref) ?? [];
};

export const fetchPhotosByCategory = (
  category: Category,
): Promise<ReadonlyArray<SanityPhoto>> =>
  getClient().fetch<ReadonlyArray<SanityPhoto>>(
    `*[_type == "photo" && category == $category] | order(order asc){ ${PHOTO_PROJECTION} }`,
    { category },
  );

export const fetchAbout = (): Promise<SanityAbout | null> =>
  getClient().fetch<SanityAbout | null>(
    `*[_type == "about" && _id == "about"][0]{ _id, ${IMAGE_PROJECTION}, altTitle }`,
  );

export const setCategoryOrder = async (
  photoIds: ReadonlyArray<string>,
): Promise<void> => {
  const transaction = photoIds.reduce(
    (tx, id, index) => tx.patch(id, (p) => p.set({ order: index + 1 })),
    getClient().transaction(),
  );
  await transaction.commit();
};

export const uploadMediaFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const asset = await getClient().assets.upload("image", Buffer.from(buffer), {
    filename: file.name,
    contentType: file.type,
  });
  return asset._id;
};
