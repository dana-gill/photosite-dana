/// <reference lib="deno.unstable" />

import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { refreshCache } from "./services/image-service.ts";
import { startCacheRefreshScheduler } from "./services/scheduler.ts";

export const app = new App<State>();

// Initialize KV once and store globally
const kv = await Deno.openKv();

// Initialize cache on startup
console.log("Initializing cache from Strapi...");

try {
  await refreshCache(kv);
  console.log("Cache initialized successfully");
} catch (error) {
  console.error("Failed to initialize cache:", error);
  console.error(
    "Error details:",
    error instanceof Error ? error.message : String(error),
  );
}

// Start background refresh scheduler
startCacheRefreshScheduler(kv);

app.use(staticFiles());

// Inject KV into all requests via state
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  ctx.state.kv = kv;
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
