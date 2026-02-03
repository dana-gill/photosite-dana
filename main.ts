import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { refreshCache } from "./services/image-service.ts";
import { startCacheRefreshScheduler } from "./services/scheduler.ts";

export const app = new App<State>();

// Initialize cache on startup
console.log("Initializing cache from Strapi...");
console.log("STRAPI_URL:", Deno.env.get("STRAPI_URL"));
console.log("STRAPI_API_TOKEN configured:", !!Deno.env.get("STRAPI_API_TOKEN"));

try {
  await refreshCache();
  console.log("Cache initialized successfully");
} catch (error) {
  console.error("Failed to initialize cache:", error);
  console.error("Error details:", error instanceof Error ? error.message : String(error));
}

// Start background refresh scheduler
startCacheRefreshScheduler();

app.use(staticFiles());

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  return await ctx.next();
});

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return ctx.next();
});
app.use(exampleLoggerMiddleware);

// Include file-system based routes here
app.fsRoutes();
