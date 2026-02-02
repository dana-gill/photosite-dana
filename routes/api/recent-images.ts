import { getAllImages } from "../../services/cache-manager.ts";
import type { StrapiImage } from "../../types/strapi.ts";

export const handler = async () => {
  const allImages = await getAllImages();

  const sortedImages = [...allImages].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  const recentImages: ReadonlyArray<StrapiImage> = sortedImages.slice(0, 10);

  return new Response(JSON.stringify(recentImages), {
    headers: { "Content-Type": "application/json" },
  });
};
