/// <reference lib="deno.unstable" />

import { refreshCache } from "./image-service.ts";

const CACHE_REFRESH_INTERVAL_MINUTES = Number(Deno.env.get("CACHE_REFRESH_INTERVAL_MINUTES") ?? "30");

let intervalId: number | null = null;

export const startCacheRefreshScheduler = (kv: Deno.Kv): void => {
  const intervalMs = CACHE_REFRESH_INTERVAL_MINUTES * 60 * 1000;

  console.log(`Starting cache refresh scheduler (every ${CACHE_REFRESH_INTERVAL_MINUTES} minutes)`);

  intervalId = setInterval(async () => {
    console.log("Running scheduled cache refresh...");
    try {
      await refreshCache(kv);
      console.log("Cache refresh completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Cache refresh failed:", errorMessage);
    }
  }, intervalMs);
};

export const stopScheduler = (): void => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Cache refresh scheduler stopped");
  }
};
