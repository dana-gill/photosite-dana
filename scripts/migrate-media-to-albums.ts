const STRAPI_URL = Deno.env.get("STRAPI_URL") ?? "";
const STRAPI_API_TOKEN = Deno.env.get("STRAPI_API_TOKEN") ?? "";

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error("Missing required env vars: STRAPI_URL, STRAPI_API_TOKEN");
  Deno.exit(1);
}

interface StrapiFile {
  readonly id: number;
  readonly name: string;
  readonly url: string;
}

interface CreatedAlbum {
  readonly data: {
    readonly documentId: string;
  };
}

const strapiHeaders = {
  "Authorization": `Bearer ${STRAPI_API_TOKEN}`,
  "Content-Type": "application/json",
};

const extractAlbumPrefix = (filename: string): string => {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const hasNumericSuffix = /_\d+$/.test(withoutExtension);
  if (!hasNumericSuffix) {
    return withoutExtension;
  }
  const parts = withoutExtension.split("_");
  return parts.slice(0, -1).join("_");
};

const extractNumericSuffix = (filename: string): number => {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const parts = withoutExtension.split("_");
  const lastPart = parts[parts.length - 1];
  const numericValue = lastPart ? parseInt(lastPart, 10) : 0;
  return isNaN(numericValue) ? 0 : numericValue;
};

const sanitizeSlug = (prefix: string): string =>
  prefix.replace(/&/g, "and").replace(/[^A-Za-z0-9\-_.~]/g, "-").replace(
    /-+/g,
    "-",
  ).replace(/^-|-$/g, "");

const toTitleCase = (slug: string): string =>
  slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fetchAllFiles = async (): Promise<ReadonlyArray<StrapiFile>> => {
  const url = `${STRAPI_URL}/api/upload/files?pageSize=100`;
  const response = await fetch(url, { headers: strapiHeaders });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch files: ${errorText}`);
  }

  const data: StrapiFile[] = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      `Unexpected response shape: ${JSON.stringify(data).substring(0, 200)}`,
    );
  }

  return data;
};

const createAlbum = async (
  title: string,
  slug: string,
): Promise<string> => {
  const response = await fetch(`${STRAPI_URL}/api/albums`, {
    method: "POST",
    headers: strapiHeaders,
    body: JSON.stringify({ data: { title, slug } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create album "${slug}": ${errorText}`);
  }

  const created: CreatedAlbum = await response.json();
  return created.data.documentId;
};

const createPhoto = async (
  imageId: number,
  order: number,
  albumDocumentId: string,
): Promise<void> => {
  const response = await fetch(`${STRAPI_URL}/api/photos`, {
    method: "POST",
    headers: strapiHeaders,
    body: JSON.stringify({
      data: { image: imageId, order, album: albumDocumentId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create photo (imageId=${imageId}, order=${order}): ${errorText}`,
    );
  }
};

const groupFilesByPrefix = (
  files: ReadonlyArray<StrapiFile>,
): Map<string, StrapiFile[]> => {
  const groups = new Map<string, StrapiFile[]>();

  files.forEach((file) => {
    const prefix = extractAlbumPrefix(file.name);
    const existing = groups.get(prefix) ?? [];
    groups.set(prefix, [...existing, file]);
  });

  return groups;
};

const sortByNumericSuffix = (
  files: ReadonlyArray<StrapiFile>,
): ReadonlyArray<StrapiFile> =>
  [...files].sort((a, b) =>
    extractNumericSuffix(a.name) - extractNumericSuffix(b.name)
  );

const migrate = async (): Promise<void> => {
  console.log("Fetching all files from Strapi Media Library...");
  const files = await fetchAllFiles();
  console.log(`Found ${files.length} files.`);

  const groups = groupFilesByPrefix(files);
  console.log(`Grouped into ${groups.size} albums.\n`);

  let albumsCreated = 0;
  let photosCreated = 0;
  const errors: string[] = [];

  for (const [prefix, groupFiles] of groups) {
    const slug = sanitizeSlug(prefix);
    const title = toTitleCase(slug);
    const sorted = sortByNumericSuffix(groupFiles);

    try {
      const albumDocumentId = await createAlbum(title, slug);
      console.log(
        `✓ Album "${title}" (${prefix}) — documentId: ${albumDocumentId}`,
      );
      albumsCreated++;

      for (const [index, file] of sorted.entries()) {
        try {
          await createPhoto(file.id, index, albumDocumentId);
          console.log(`  ✓ Photo ${index}: ${file.name} (id=${file.id})`);
          photosCreated++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(message);
          console.error(`  ✗ ${message}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      console.error(`✗ ${message}`);
    }

    console.log();
  }

  console.log("--- Migration complete ---");
  console.log(`Albums created: ${albumsCreated}`);
  console.log(`Photos linked: ${photosCreated}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error("\nErrors encountered:");
    errors.forEach((e) => console.error(`  - ${e}`));
    Deno.exit(1);
  }
};

await migrate();
