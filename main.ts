/// <reference lib="deno.unstable" />

import { App, staticFiles } from "fresh";
import type { State, WorkPreview } from "./utils.ts";
import { refreshAlbumCache } from "./services/image-service.ts";
import {
  getAllAlbumSlugs,
  getAlbumBySlug,
  getPhotosByAlbumSlug,
} from "./services/cache-manager.ts";
import type { NavLink } from "./types/nav.ts";

export const app = new App<State>();

const kv = await Deno.openKv();

console.log("Checking cache status...");

try {
  const slugs = await getAllAlbumSlugs(kv);

  if (slugs.length === 0) {
    console.log("Cache empty — fetching from Sanity...");
    await refreshAlbumCache(kv);
    const refreshedSlugs = await getAllAlbumSlugs(kv);
    console.log(`Cache initialized: ${refreshedSlugs.length} albums`);
  } else {
    console.log(`Cache is fresh: ${slugs.length} albums`);
  }
} catch (error) {
  console.error("Failed to initialize cache:", error);
  console.error(
    "Error details:",
    error instanceof Error ? error.message : String(error),
  );
}

const fetchWorkLinks = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<NavLink>> => {
  const slugs = await getAllAlbumSlugs(kv);
  const albums = await Promise.all(slugs.map((slug) => getAlbumBySlug(kv, slug)));
  return albums
    .filter((album): album is NonNullable<typeof album> => album !== null)
    .map((album) => ({ href: `/work/${album.slug}`, label: album.title }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const fetchWorkPreviews = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<WorkPreview>> => {
  const slugs = await getAllAlbumSlugs(kv);
  const previews = await Promise.all(
    slugs.map(async (slug): Promise<WorkPreview | null> => {
      const photos = await getPhotosByAlbumSlug(kv, slug);
      const first = photos?.[0];
      if (!first || !first.image?.asset?.metadata) return null;
      return {
        height: first.image.asset.metadata.dimensions.height,
        href: `/work/${slug}`,
        imageUrl: first.image.asset.url,
        width: first.image.asset.metadata.dimensions.width,
      };
    }),
  );
  return previews.filter((p): p is WorkPreview => p !== null);
};

app.use(staticFiles());

app.use(async (ctx) => {
  const [workLinks, workPreviews] = await Promise.all([
    fetchWorkLinks(kv),
    fetchWorkPreviews(kv),
  ]);
  ctx.state.shared = "hello";
  ctx.state.kv = kv;
  ctx.state.workLinks = workLinks;
  ctx.state.workPreviews = workPreviews;
  return await ctx.next();
});

app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

app.fsRoutes();
