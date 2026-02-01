# Deno KV + Strapi Caching Implementation Plan

## Overview
Implement a hybrid caching layer using Deno KV and in-memory storage to organize and serve Strapi images by album prefix (e.g., `meri2025_IMG_2222.jpg`).

## Architecture

### Data Flow
```
Strapi (Source) → Fetch All Images → Parse & Group by Prefix → Store in Cache → Serve via API
```

### Cache Layers
1. **Primary**: In-memory Map for instant lookups
2. **Backup**: Deno KV for persistence across restarts
3. **Source**: Strapi REST API (`/api/upload/files`)

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
- `fetchAllImagesFromStrapi()` - Fetch all images from Strapi
- `extractAlbumPrefix()` - Extract album name from filename
- `groupImagesByAlbum()` - Organize images into album groups
- `refreshCache()` - Update both cache layers

### Step 3: Implement Cache Manager
Create cache manager with dual-layer storage.

**File**: `services/cache-manager.ts`
- `initializeCache()` - Set up Deno KV and in-memory Map
- `getImagesByAlbum()` - Retrieve images for specific album
- `getAllAlbums()` - List all available albums
- `getCacheMetadata()` - Get cache stats (last refresh, image count)
- `clearCache()` - Reset both cache layers

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
const prefix = filename.split('_')[0];
```

### Cache Structure (Deno KV)
```typescript
// Key: ['albums', albumName]
// Value: StrapiImage[]
kv.set(['albums', 'meri2025'], images);
kv.set(['cache', 'metadata'], { lastRefresh: Date, totalImages: number });
```

### Cache Structure (In-Memory)
```typescript
// Map<albumName, StrapiImage[]>
const albumCache = new Map([
  ['meri2025', [...images]],
  ['wedding2024', [...images]]
]);
```

## Performance Considerations

- **Initial Load**: ~1-3 seconds to fetch and cache all images
- **Subsequent Requests**: <10ms from in-memory cache
- **Persistence**: Deno KV ensures cache survives restarts
- **Refresh Strategy**: Background refresh prevents blocking requests

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

- ✅ Images organized by album prefix
- ✅ Fast lookups (<10ms) for cached albums
- ✅ Cache persists across server restarts
- ✅ Automatic background refresh
- ✅ Clean API for frontend consumption
