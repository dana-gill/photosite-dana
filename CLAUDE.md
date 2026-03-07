# Photosite Project Instructions

## Adding a New Album

Albums are managed entirely in Strapi — no code changes are needed to add a new work page.

To add a new album:
1. In the Strapi admin UI, create a new **Album** entry with the desired `title`, `slug`, and `description`
2. Create **Photo** entries linked to that album, each with an `image`, `order`, and optional `altTitle`/`caption`
3. Trigger a cache refresh via `POST /api/cache/refresh` (or restart the server)

The album will automatically appear at `/work/{slug}` once the cache is populated.
