# Photosite Project Instructions

## Generating a New Work Page

When the user requests a new work page, you should:

1. Ask for the following information if not provided:
   - **Page title** (required): The display title for the work
   - **Description/subtitle** (required): A brief description or time period for the work
   - **Strapi album name** (optional): The album name in Strapi to fetch images from. If not provided, derive a lowercase, hyphenated version from the title (e.g., "Sunchasing" → "sunchasing", "E & C" → "e-amp-c")

2. Create a new file at `routes/work/{slug}.tsx` where `{slug}` is a URL-friendly version of the title:
   - Convert to lowercase
   - Replace spaces and special characters with hyphens
   - Use `--amp--` for ampersands (&)
   - Examples: "Sunchasing" → "sunchasing.tsx", "E & C" → "e--amp-c.tsx"

3. Use this template structure:

```tsx
import type { StrapiImage } from "../../types/strapi.ts";
import { Head } from "fresh/runtime";
import { Image } from "../../components/Image.tsx";
import { PageHeader } from "../../components/PageHeader.tsx";
import { define } from "../../utils.ts";
import { getImagesByAlbum } from "../../services/cache-manager.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const images = await getImagesByAlbum(ctx.state.kv, "{album-name}") ?? [];
    return { data: images };
  },
});

export default define.page<typeof handler>(function {ComponentName}({ data }) {
  const images = data;

  return (
    <div class="px-4 py-8 mx-auto md:min-h-screen bg-gray-50">
      <Head>
        <title>{Page Title} - Dana Gill Photography</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <PageHeader
          title="{Page Title}"
          subtitle="{Description/Subtitle}"
        />
        <div class="flex flex-wrap justify-evenly gap-6 items-center">
          {images.map((image: StrapiImage) => (
            <div key={image.id} class="overflow-hidden max-w-lg fade-in-images">
              <Image
                alt={image.alternativeText ?? image.name}
                formats={image.formats}
                height={image.height}
                src={image.url}
                width={image.width}
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

4. Replace the placeholders:
   - `{album-name}`: The Strapi album name provided or derived from the title
   - `{ComponentName}`: PascalCase version of the title (e.g., "Sunchasing", "Coron")
   - `{Page Title}`: The exact title provided by the user
   - `{Description/Subtitle}`: The description provided by the user

5. After creating the file, run the linter and typecheck to ensure code quality.

## Example Usage

**User input:**
Generate work page:
- Title: "Meri in Pberg"
- Description: "A photo series. 2023."
- Strapi album: "meri-pberg"

**Generated file:** `routes/work/meri-in-pberg.tsx`

**Key values:**
- Album name in handler: `"meri-pberg"`
- Component name: `MeriInPberg`
- Head title: `"Meri in Pberg - Dana Gill Photography"`
- PageHeader title: `"Meri in Pberg"`
- PageHeader subtitle: `"A photo series. 2023."`
