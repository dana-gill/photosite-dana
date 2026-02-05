/// <reference lib="deno.unstable" />

import { App, staticFiles } from "fresh";
import type { State, WorkPreview } from "./utils.ts";
import { refreshCache } from "./services/image-service.ts";
import {
  getCacheMetadata,
  getImagesByAlbum,
} from "./services/cache-manager.ts";
import type { NavLink } from "./types/nav.ts";

export const app = new App<State>();

// Initialize KV once and store globally
const kv = await Deno.openKv();

// Initialize cache on startup
console.log("Checking cache status...");

try {
  const metadata = await getCacheMetadata(kv);
  const shouldRefresh = !metadata;

  if (shouldRefresh) {
    const reason = !metadata ? "cache is empty" : "cache is stale";
    console.log(`Fetching from Strapi (${reason})...`);
    await refreshCache(kv);
    console.log("Cache initialized successfully");
  } else {
    console.log(
      `Cache is fresh (last refresh: ${metadata.lastRefresh}), skipping Strapi fetch`,
    );
  }
} catch (error) {
  console.error("Failed to initialize cache:", error);
  console.error(
    "Error details:",
    error instanceof Error ? error.message : String(error),
  );
}

const extractAlbumNameFromFile = async (
  filePath: string,
): Promise<string | null> => {
  const content = await Deno.readTextFile(filePath);
  const match = content.match(/getImagesByAlbum\([^,]+,\s*["']([^"']+)["']\)/);
  return match ? match[1] : null;
};

const fetchWorkPreviews = async (
  kv: Deno.Kv,
): Promise<ReadonlyArray<WorkPreview>> => {
  const workDir = `${Deno.cwd()}/routes/work`;
  const previews: WorkPreview[] = [];

  const entries = [];
  for await (const entry of Deno.readDir(workDir)) {
    if (entry.isFile && entry.name.endsWith(".tsx")) {
      entries.push(entry);
    }
  }

  const previewPromises = entries.map(async (entry) => {
    const fileName = entry.name.replace(".tsx", "");
    const filePath = `${workDir}/${entry.name}`;
    const albumName = await extractAlbumNameFromFile(filePath);

    if (albumName) {
      const images = await getImagesByAlbum(kv, albumName);
      if (images && images.length > 0) {
        const firstImage = images[0];
        const imageUrl = firstImage.formats?.medium?.url ??
          firstImage.formats?.small?.url ??
          firstImage.url;

        return {
          height: firstImage.formats?.medium?.height ??
            firstImage.formats?.small?.height ??
            firstImage.height,
          href: `/work/${fileName}`,
          imageUrl,
          width: firstImage.formats?.medium?.width ??
            firstImage.formats?.small?.width ??
            firstImage.width,
        };
      }
    }
    return null;
  });

  const results = await Promise.all(previewPromises);
  const filteredPreviews = results.filter((preview): preview is WorkPreview =>
    preview !== null
  );

  previews.push(...filteredPreviews);

  return previews;
};

const fetchWorkLinks = async (): Promise<ReadonlyArray<NavLink>> => {
  const { handler: workLinksHandler } = await import(
    "./routes/api/work-links.ts"
  );
  const workLinksResponse = await workLinksHandler();
  const workLinks = await workLinksResponse.json();
  return workLinks;
};

// Initialize work data once on startup
const workLinks = await fetchWorkLinks();
const workPreviews = await fetchWorkPreviews(kv);

app.use(staticFiles());

// Inject KV and work data into all requests via state
app.use(async (ctx) => {
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
