# photosite-dana

Photo gallery site using Fresh (Deno), Deno KV cache, and Strapi CMS.

**Production URL:** https://photosite-dana.danadeploy.deno.net/

## Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```
deno task dev
```

This will watch the project directory and restart as necessary.

## API Endpoints

All endpoints require authentication with the `PHOTOSITE_TOKEN` from your `.env` file.

### Get All Albums

**Local:**
```bash
curl http://localhost:8000/api/albums \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

**Production:**
```bash
curl https://photosite-dana.danadeploy.deno.net/api/albums \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

Returns a list of all albums with image counts:
```json
[
  {
    "name": "meri2025",
    "imageCount": 42
  },
  {
    "name": "wedding2024",
    "imageCount": 156
  }
]
```

### Get Album Images

**Local:**
```bash
curl http://localhost:8000/api/albums/meri2025 \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

**Production:**
```bash
curl https://photosite-dana.danadeploy.deno.net/api/albums/meri2025 \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

Returns all images for the specified album with full Strapi metadata.

### Refresh Cache

Manually trigger a cache refresh from Strapi:

**Local:**
```bash
curl -X POST http://localhost:8000/api/cache/refresh \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

**Production:**
```bash
curl -X POST https://photosite-dana.danadeploy.deno.net/api/cache/refresh \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

Returns refresh status and cache metadata:
```json
{
  "success": true,
  "metadata": {
    "lastRefresh": "2026-02-01T19:30:00.000Z",
    "totalImages": 198,
    "albumCount": 2
  }
}
```

Replace `YOUR_PHOTOSITE_TOKEN` with the value from your `.env` file.
