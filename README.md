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

## Creating Image Gallery Pages

To create a new image gallery page:

1. **Upload images to Strapi** and tag them with an album name (e.g., `my-album`)

2. **Create a new page file** in `routes/work/` named after your album:
   ```bash
   # Example: routes/work/my-album.tsx
   ```

3. **Use this template** (replace `my-album` with your album name):
   ```tsx
   import type { StrapiImage } from "../../types/strapi.ts";
   import { Head } from "fresh/runtime";
   import { Image } from "../../components/Image.tsx";
   import { PageHeader } from "../../components/PageHeader.tsx";
   import { define } from "../../utils.ts";
   import { getImagesByAlbum } from "../../services/cache-manager.ts";

   export const handler = define.handlers({
     GET: async (_ctx) => {
       const images = await getImagesByAlbum("my-album") ?? [];
       console.log(`[my-album] Retrieved ${images.length} images from cache`);
       return { data: images };
     },
   });

   export default define.page<typeof handler>(function MyAlbum({ data }) {
     const images = data;

     return (
       <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
         <Head>
           <title>My Album Photos</title>
         </Head>
         <div class="max-w-7xl mx-auto">
           <PageHeader title="My Album" subtitle="Subtitle here" />
           <div class="flex flex-wrap justify-evenly gap-6 items-center">
             {images.map((image: StrapiImage) => (
               <div key={image.id} class="overflow-hidden max-w-lg fade-in-images">
                 <Image
                   src={image.url}
                   alt={image.alternativeText ?? image.name}
                   width={image.width}
                   height={image.height}
                 />
                 {image.caption && (
                   <div class="p-4">
                     <p class="text-sm text-gray-600">{image.caption}</p>
                   </div>
                 )}
               </div>
             ))}
           </div>
           {images.length === 0 && (
             <p class="text-center text-gray-500 mt-8">No images found</p>
           )}
         </div>
       </div>
     );
   });
   ```

4. **Generate navigation links**:
   ```bash
   deno task generate-work-links
   ```
   This automatically scans `routes/work/` and updates the Work navigation menu.

5. **Access your page** at `/work/my-album`

The page will automatically fetch and display all images tagged with the specified album name from Strapi via the Deno KV cache.

### File Naming Conventions

The file name determines the navigation title:

- **Single hyphens** (`-`) are converted to spaces
  - Example: `my-album.tsx` → "My Album"

- **Double hyphens** (`--`) are preserved as single hyphens in the title
  - Example: `reich--van-der-rohe-pavilion.tsx` → "Reich-Van der Rohe Pavilion"

- Words like "a", "an", "the", "in", "of", "der" are kept lowercase (unless they're the first word)

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
