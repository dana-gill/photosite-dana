import { define } from "../utils.ts";
import { getImagesByAlbum } from "../services/cache-manager.ts";
import Nav from "../islands/Nav.tsx";

interface WorkPreview {
  height: number;
  href: string;
  imageUrl: string;
  width: number;
}

const extractAlbumNameFromFile = async (
  filePath: string,
): Promise<string | null> => {
  const content = await Deno.readTextFile(filePath);
  const match = content.match(/getImagesByAlbum\([^,]+,\s*["']([^"']+)["']\)/);
  return match ? match[1] : null;
};

const fetchWorkPreviews = async (kv: Deno.Kv): Promise<ReadonlyArray<WorkPreview>> => {
  const workDir = `${Deno.cwd()}/routes/work`;
  const previews: WorkPreview[] = [];

  const entries = [];
  for await (const entry of Deno.readDir(workDir)) {
    if (entry.isFile && entry.name.endsWith(".tsx")) {
      entries.push(entry);
    }
  }

  const previewPromises = entries.map(async (entry) => {
    const fileName = entry.name.replace(".tsx", "");
    const filePath = `${workDir}/${entry.name}`;
    const albumName = await extractAlbumNameFromFile(filePath);

    if (albumName) {
      const images = await getImagesByAlbum(kv, albumName);
      if (images && images.length > 0) {
        const firstImage = images[0];
        const imageUrl = firstImage.formats?.medium?.url ??
          firstImage.formats?.small?.url ??
          firstImage.url;

        return {
          height: firstImage.formats?.medium?.height ??
            firstImage.formats?.small?.height ??
            firstImage.height,
          href: `/work/${fileName}`,
          imageUrl,
          width: firstImage.formats?.medium?.width ??
            firstImage.formats?.small?.width ??
            firstImage.width,
        };
      }
    }
    return null;
  });

  const results = await Promise.all(previewPromises);
  const filteredPreviews = results.filter((preview): preview is WorkPreview =>
    preview !== null
  );

  previews.push(...filteredPreviews);

  return previews;
};

export const handler = define.handlers({
  GET: async (ctx) => {
    const { handler: workLinksHandler } = await import(
      "./api/work-links.ts"
    );
    const workLinksResponse = await workLinksHandler();
    const workLinks = await workLinksResponse.json();
    const workPreviews = await fetchWorkPreviews(ctx.state.kv);

    return {
      data: {
        workLinks,
        workPreviews,
      },
    };
  },
});

export default define.page<typeof handler>(function App({ Component, data }) {
  const { workLinks, workPreviews } = data;

  return (
    <html>
      {/* Congrats! You found an easter egg.
        I wrote this website myself.
        You are welcome to roast my code here:
        https://github.com/dana-gill/photosite-dana */}
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dana Gill Photography</title>
        <meta
          property="og:title"
          content="  Dana Gill Photography - Analog Film Photos from Berlin"
        />
        <meta
          property="og:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          property="og:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
        <meta property="og:url" content="https://www.danagill.photography" />
        <meta property="og:site_name" content="Dana Gill Photography" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dana Gill Photography" />
        <meta
          name="twitter:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          name="twitter:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
      </head>
      <body>
        <Nav workLinks={workLinks} workPreviews={workPreviews} />
        <Component />
      </body>
    </html>
  );
});
