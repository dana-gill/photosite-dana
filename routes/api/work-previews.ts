import { define } from "../../utils.ts";
import { getImagesByAlbum } from "../../services/cache-manager.ts";

interface WorkPreview {
  href: string;
  imageUrl: string;
  width: number;
  height: number;
}

const extractAlbumNameFromFile = async (filePath: string): Promise<string | null> => {
  const content = await Deno.readTextFile(filePath);
  const match = content.match(/getImagesByAlbum\([^,]+,\s*["']([^"']+)["']\)/);
  return match ? match[1] : null;
};

export const handler = define.handlers({
  GET: async (ctx) => {
    const workDir = new URL("../../routes/work", import.meta.url).pathname;
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
        const images = await getImagesByAlbum(ctx.state.kv, albumName);
        if (images && images.length > 0) {
          const firstImage = images[0];
          const imageUrl = firstImage.formats?.medium?.url ??
                           firstImage.formats?.small?.url ??
                           firstImage.url;

          return {
            href: `/work/${fileName}`,
            imageUrl,
            width: firstImage.formats?.medium?.width ??
                   firstImage.formats?.small?.width ??
                   firstImage.width,
            height: firstImage.formats?.medium?.height ??
                    firstImage.formats?.small?.height ??
                    firstImage.height,
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

    return new Response(JSON.stringify(previews), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
