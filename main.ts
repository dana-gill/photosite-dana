/// <reference lib="deno.unstable" />

import { App, staticFiles } from "fresh";
import type { State, WorkPreview } from "./utils.ts";
import { refreshAlbumCache, refreshCache } from "./services/image-service.ts";
import {
  getAllAlbumSlugs,
  getCacheMetadata,
  getAlbumBySlug,
  getPhotosByAlbumSlug,
} from "./services/cache-manager.ts";
import type { NavLink } from "./types/nav.ts";

export const app = new App<State>();

// Initialize KV once and store globally
const kv = await Deno.openKv();

// Initialize cache on startup
console.log("Checking cache status...");

try {
  const metadata = await getCacheMetadata(kv);
  const slugs = await getAllAlbumSlugs(kv);
  const hasValidMetadata = metadata && metadata.albumCount > 0 && metadata.totalImages > 0 && slugs.length > 0;
  const shouldRefresh = !hasValidMetadata;

  if (shouldRefresh) {
    const reason = !metadata
      ? "metadata missing"
      : "cache empty or corrupted";
    console.log(`Fetching from Strapi (${reason})...`);
    await Promise.all([refreshCache(kv), refreshAlbumCache(kv)]);
    const newMetadata = await getCacheMetadata(kv);
    console.log(
      `Cache initialized: ${newMetadata?.albumCount} albums, ${newMetadata?.totalImages} images`,
    );
  } else {
    console.log(
      `Cache is fresh: ${metadata.albumCount} albums, ${metadata.totalImages} images (last refresh: ${metadata.lastRefresh})`,
    );
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
      if (!first) return null;
      return {
        height: first.image.formats?.medium?.height ?? first.image.formats?.small?.height ?? first.image.height,
        href: `/work/${slug}`,
        imageUrl: first.image.formats?.medium?.url ?? first.image.formats?.small?.url ?? first.image.url,
        width: first.image.formats?.medium?.width ?? first.image.formats?.small?.width ?? first.image.width,
      };
    }),
  );
  return previews.filter((p): p is WorkPreview => p !== null);
};

app.use(staticFiles());

// Inject KV and work data into all requests via state
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

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

// Include file-system based routes here
app.fsRoutes();
