# Deno KV + Strapi Caching Implementation Plan

## Overview

Implement a caching layer using Deno KV to organize and serve Strapi images by
album prefix (e.g., `meri2025_IMG_2222.jpg`).

## Architecture

### Data Flow

```
Strapi (Source) → Fetch All Images → Parse & Group by Prefix → Store in Cache → Serve via API
```

### Cache Layers

1. **Cache**: Deno KV for persistent storage and fast lookups
2. **Source**: Strapi REST API (`/api/upload/files`)

## Implementation Steps

### Step 1: Create Type Definitions

Create types file for Strapi image responses and album structures.

**File**: `types/strapi.ts`

- `StrapiImage` interface
- `StrapiFileResponse` interface
- `AlbumImages` type
- `CacheMetadata` interface

### Step 2: Build Image Service

Create service to fetch and organize images from Strapi.

**File**: `services/image-service.ts`

- `fetchAllImagesFromStrapi()` - Fetch all images from Strapi API
- `extractAlbumPrefix()` - Extract album name from filename (e.g., "meri2025"
  from "meri2025_IMG_2222.jpg")
- `groupImagesByAlbum()` - Organize images into Map<albumName, images[]>
- `refreshCache()` - Orchestrate full refresh: fetch → group → call cache
  manager's `saveAllAlbums()` to write to KV

### Step 3: Implement Cache Manager

Create cache manager using Deno KV.

**File**: `services/cache-manager.ts`

- `initializeCache()` - Open Deno KV connection
- `saveToCache(albumName, images)` - **Write to KV**: Call
  `kv.set(['albums', albumName], images)`
- `saveAllAlbums(albumsMap)` - **Iterate and write all albums**: Loop through
  grouped albums and call `kv.set()` for each
- `saveCacheMetadata(metadata)` - **Write metadata to KV**: Call
  `kv.set(['cache', 'metadata'], metadata)`
- `getImagesByAlbum(albumName)` - Retrieve images for specific album: Call
  `kv.get(['albums', albumName])`
- `getAllAlbums()` - List all available albums by scanning KV with prefix
  `['albums']`
- `getCacheMetadata()` - Get cache stats (last refresh, image count) from KV
- `clearCache()` - Delete all KV entries with prefix `['albums']` and
  `['cache']`

### Step 4: Create API Routes

Build Fresh API routes to serve cached images.

**File**: `routes/api/albums/index.ts`

- GET `/api/albums` - List all albums with image counts

**File**: `routes/api/albums/[album].ts`

- GET `/api/albums/meri2025` - Get all images for album

**File**: `routes/api/cache/refresh.ts`

- POST `/api/cache/refresh` - Manually trigger cache refresh

### Step 5: Add Background Refresh

Implement periodic cache refresh mechanism.

**File**: `services/scheduler.ts`

- `startCacheRefreshScheduler()` - Run refresh every X minutes
- `stopScheduler()` - Cleanup function

**Update**: `main.ts`

- Initialize cache on server start
- Start background scheduler

### Step 6: Create Environment Configuration

Add Strapi configuration to environment.

**Update**: `.env`

- Verify `STRAPI_URL` exists
- Verify `STRAPI_API_TOKEN` exists
- Add `CACHE_REFRESH_INTERVAL_MINUTES` (default: 30)

### Step 7: Build Frontend Components (Optional)

Create UI to display albums and images.

**File**: `islands/AlbumGallery.tsx`

- Fetch and display images from cache API
- Grid layout with lazy loading

**File**: `routes/gallery.tsx`

- Gallery page route

## Technical Details

### Album Prefix Extraction

```typescript
// Extract "meri2025" from "meri2025_IMG_2222.jpg"
const prefix = filename.split("_")[0];
```

### Cache Structure (Deno KV)

```typescript
// Store album images
// Key: ['albums', albumName]
// Value: StrapiImage[]
await kv.set(["albums", "meri2025"], images);
await kv.set(["albums", "wedding2024"], images);

// Store cache metadata
// Key: ['cache', 'metadata']
// Value: { lastRefresh: Date, totalImages: number }
await kv.set(["cache", "metadata"], {
  lastRefresh: new Date(),
  totalImages: 150,
});

// Retrieve album images
const result = await kv.get(["albums", "meri2025"]);
const images = result.value; // StrapiImage[]
```

## Performance Considerations

- **Initial Load**: ~1-3 seconds to fetch and cache all images from Strapi
- **Subsequent Requests**: <10ms from Deno KV (local SQLite in dev, distributed
  in production)
- **Persistence**: Deno KV automatically persists data across restarts
- **Refresh Strategy**: Background refresh prevents blocking requests
- **Scalability**: Deno KV handles replication and distribution in production

## Error Handling

- Graceful fallback if Strapi is unreachable
- Stale cache serving during refresh failures
- Logging for debugging cache misses
- Retry logic for Strapi API failures

## Testing Strategy

- Test album prefix extraction with various filenames
- Verify cache persistence across server restarts
- Test cache refresh under load
- Validate API route responses

## Success Criteria

- ✅ Images organized by album prefix in Deno KV
- ✅ Fast lookups (<10ms) for cached albums
- ✅ Cache persists across server restarts
- ✅ Automatic background refresh from Strapi
- ✅ Clean API for frontend consumption
- ✅ Simple, maintainable codebase (single source of truth)
