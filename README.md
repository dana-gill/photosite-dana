# Fresh project

Your new Fresh project is ready to go. You can follow the Fresh "Getting
Started" guide here: https://fresh.deno.dev/docs/getting-started

### Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```
deno task dev
```

This will watch the project directory and restart as necessary.

## Cache Refresh

To manually refresh the cache from Strapi:

```bash
curl -X POST http://localhost:8000/api/cache/refresh \
  -H "Authorization: Bearer YOUR_PHOTOSITE_TOKEN"
```

Replace `YOUR_PHOTOSITE_TOKEN` with the value from your `.env` file.

# photosite-dana
