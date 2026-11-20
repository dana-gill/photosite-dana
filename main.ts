/// <reference lib="deno.unstable" />

import { App, staticFiles } from "fresh";
import type { State } from "./utils.ts";
import { refreshCategoryCache } from "./services/image-service.ts";
import { getAbout, getPhotosByCategory } from "./services/cache-manager.ts";
import { CATEGORIES } from "./types/category.ts";

export const app = new App<State>();

const kv = await Deno.openKv();

console.log("Checking cache status...");

try {
  const photoArrays = await Promise.all(
    CATEGORIES.map((category) => getPhotosByCategory(kv, category)),
  );

  if (photoArrays.every((photos) => photos.length === 0)) {
    console.log("Cache empty — fetching from Sanity...");
    await refreshCategoryCache(kv);
    const refreshed = await Promise.all(
      CATEGORIES.map((category) => getPhotosByCategory(kv, category)),
    );
    refreshed.forEach((photos, index) =>
      console.log(`Cache initialized: ${CATEGORIES[index]} ${photos.length}`)
    );
  } else {
    const total = photoArrays.reduce((sum, photos) => sum + photos.length, 0);
    console.log(`Cache is fresh: ${total} photos`);
  }
} catch (error) {
  console.error("Failed to initialize cache:", error);
  console.error(
    "Error details:",
    error instanceof Error ? error.message : String(error),
  );
}

app.use(staticFiles());

app.use(async (ctx) => {
  ctx.state.shared = "hello";
  ctx.state.kv = kv;
  const about = await getAbout(kv);
  ctx.state.ogImageUrl = about
    ? `${about.image.asset.url}?w=1200&fm=jpg`
    : null;
  return await ctx.next();
});

app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

app.fsRoutes();
