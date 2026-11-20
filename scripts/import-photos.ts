// Imports photos from local folders into Sanity.
//
// Layout (root defaults to `assets`):
//   <root>/<category>/  images for one category (architecture, couples, portraits)
//   <root>/about/       exactly 1 image, set on the `about` singleton
//   <root>/carousel/    byte-identical copies of category photos, set as the carousel
//
// The folders hold about 150 MB. Files are NOT resized: Sanity stores the
// originals and its CDN serves resized versions. After the import, refresh the
// cache with `POST /api/cache/refresh`.
//
// Usage: deno run -A --env scripts/import-photos.ts [root=assets] [--confirm]
// Without --confirm the script does not upload or write anything.
import { Buffer } from "node:buffer";
import { createClient } from "@sanity/client";
import type { SanityClient } from "@sanity/client";
import { saveCarousel } from "../services/photo-service.ts";
import { CATEGORIES, isCategory } from "../types/category.ts";
import type { Category } from "../types/category.ts";

type ScannedFile = {
  readonly name: string;
  readonly path: string;
  readonly sha1: string;
};

type Scan = {
  readonly categories: ReadonlyArray<{
    readonly category: Category;
    readonly files: ReadonlyArray<ScannedFile>;
  }>;
  readonly about: ReadonlyArray<ScannedFile> | null;
  readonly carousel: ReadonlyArray<ScannedFile> | null;
};

type FileResult = {
  readonly file: ScannedFile;
  readonly status: "created" | "skipped" | "failed";
  readonly photoId: string | null;
  readonly message: string | null;
};

type Failure = { readonly path: string; readonly message: string };

const CONCURRENCY = 3;
const SPECIAL_DIRS: ReadonlyArray<string> = ["about", "carousel"];
const IMAGE_EXTENSION = /\.(jpe?g|png)$/i;

const args = Deno.args;
const confirm = args.includes("--confirm");
const root = args.find((arg) => !arg.startsWith("--")) ?? "assets";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const mapWithConcurrency = async <T, R>(
  items: ReadonlyArray<T>,
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<ReadonlyArray<R>> => {
  const results: Array<R> = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(
    new Uint8Array(buffer),
    (byte) => byte.toString(16).padStart(2, "0"),
  )
    .join("");

const sha1Of = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-1", bytes));

const listNames = async (
  dir: string,
  kind: "directory" | "file",
): Promise<ReadonlyArray<string>> => {
  const names: Array<string> = [];
  for await (const entry of Deno.readDir(dir)) {
    if (kind === "directory" && entry.isDirectory) names.push(entry.name);
    if (kind === "file" && entry.isFile) names.push(entry.name);
  }
  return names.sort(naturalCompare);
};

const scanFolder = async (
  dir: string,
): Promise<ReadonlyArray<ScannedFile>> => {
  const names = (await listNames(dir, "file")).filter((name) =>
    !name.startsWith(".") && IMAGE_EXTENSION.test(name)
  );
  return await Promise.all(names.map(async (name) => {
    const path = `${dir}/${name}`;
    return { name, path, sha1: await sha1Of(await Deno.readFile(path)) };
  }));
};

const scanRoot = async (): Promise<Scan> => {
  const dirs = await listNames(root, "directory");
  dirs
    .filter((name) => !(isCategory(name) || SPECIAL_DIRS.includes(name)))
    .forEach((name) => console.warn(`skip: ${name} (not a category)`));

  const categories = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      files: dirs.includes(category)
        ? await scanFolder(`${root}/${category}`)
        : [],
    })),
  );
  const about = dirs.includes("about")
    ? await scanFolder(`${root}/about`)
    : null;
  const carousel = dirs.includes("carousel")
    ? await scanFolder(`${root}/carousel`)
    : null;
  return { categories, about, carousel };
};

const createSanityClient = (): SanityClient => {
  const projectId = Deno.env.get("SANITY_PROJECT_ID");
  const apiToken = Deno.env.get("SANITY_API_TOKEN");
  const dataset = Deno.env.get("SANITY_DATASET") ?? "production";

  if (!projectId || !apiToken) {
    console.error(
      "SANITY_PROJECT_ID and SANITY_API_TOKEN env vars are required.",
    );
    Deno.exit(1);
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-03-14",
    token: apiToken,
    useCdn: false,
  });
};

const imageRef = (assetId: string) => ({
  _type: "image",
  asset: { _type: "reference", _ref: assetId },
});

const uploadAsset = async (
  client: SanityClient,
  file: ScannedFile,
): Promise<string> => {
  const bytes = await Deno.readFile(file.path);
  const asset = await client.assets.upload("image", Buffer.from(bytes), {
    filename: file.name,
  });
  return asset._id;
};

const importFile = async (
  client: SanityClient,
  category: Category,
  file: ScannedFile,
  order: number,
): Promise<FileResult> => {
  try {
    const assetId = await uploadAsset(client, file);
    const existing = await client.fetch<string | null>(
      `*[_type == "photo" && category == $category && image.asset._ref == $assetId][0]._id`,
      { category, assetId },
    );
    if (existing) {
      console.log(`skip (exists): ${category}/${file.name}`);
      return { file, status: "skipped", photoId: existing, message: null };
    }
    const doc = await client.create({
      _type: "photo",
      image: imageRef(assetId),
      category,
      order,
    });
    return { file, status: "created", photoId: doc._id, message: null };
  } catch (error) {
    return {
      file,
      status: "failed",
      photoId: null,
      message: errorMessage(error),
    };
  }
};

const importCategory = async (
  client: SanityClient,
  category: Category,
  files: ReadonlyArray<ScannedFile>,
): Promise<ReadonlyArray<FileResult>> => {
  let done = 0;
  return await mapWithConcurrency(files, CONCURRENCY, async (file, index) => {
    const result = await importFile(client, category, file, index + 1);
    done += 1;
    console.log(`${category} ${done}/${files.length}`);
    return result;
  });
};

const importAbout = async (
  client: SanityClient,
  file: ScannedFile,
): Promise<string> => {
  const assetId = await uploadAsset(client, file);
  const altTitle = await client.fetch<string | null>(
    `*[_id == "about"][0].altTitle`,
  );
  await client.createOrReplace({
    _id: "about",
    _type: "about",
    image: imageRef(assetId),
    ...(altTitle ? { altTitle } : {}),
  });
  return file.name;
};

const resolveCarouselPhotoId = async (
  client: SanityClient,
  file: ScannedFile,
  photoIdBySha: ReadonlyMap<string, string>,
): Promise<string | null> => {
  const known = photoIdBySha.get(file.sha1);
  if (known) return known;
  const assetId = await uploadAsset(client, file);
  return await client.fetch<string | null>(
    `*[_type == "photo" && image.asset._ref == $assetId][0]._id`,
    { assetId },
  );
};

const countStatus = (
  results: ReadonlyArray<FileResult>,
  status: FileResult["status"],
): number => results.filter((result) => result.status === status).length;

const validateAbout = (scan: Scan): void => {
  if (scan.about === null) return;
  if (scan.about.length === 1) return;
  console.error(
    `about: folder must hold exactly 1 image, found ${scan.about.length}`,
  );
  Deno.exit(1);
};

const dryRun = (scan: Scan): void => {
  scan.categories.forEach(({ category, files }) => {
    const first = files[0]?.name ?? "-";
    const last = files[files.length - 1]?.name ?? "-";
    console.log(
      `${category}: ${files.length} files (first: ${first}, last: ${last})`,
    );
  });

  if (scan.about === null) {
    console.log("about: folder missing, about not changed");
  } else {
    console.log(`about: ${scan.about[0].name}`);
  }

  if (scan.carousel === null) {
    console.log("carousel: folder missing, carousel not changed");
  } else {
    const categoryFiles = scan.categories.flatMap(({ category, files }) =>
      files.map((file) => ({ category, file }))
    );
    const matches = scan.carousel.map((file) => ({
      file,
      match: categoryFiles.find((entry) => entry.file.sha1 === file.sha1),
    }));
    matches.forEach(({ file, match }, index) => {
      if (match) {
        console.log(
          `carousel ${
            index + 1
          }: ${file.name} → ${match.category}/${match.file.name}`,
        );
        return;
      }
      console.error(`carousel ${index + 1}: ${file.name} → NO MATCH (error)`);
    });
    const unmatched = matches.filter(({ match }) => match === undefined);
    if (unmatched.length > 0) {
      console.error(
        `${unmatched.length} carousel file(s) match no category file: carousel would NOT be set`,
      );
      console.log("Dry run. Re-run with --confirm to upload.");
      Deno.exit(1);
    }
  }
  console.log("Dry run. Re-run with --confirm to upload.");
};

const confirmRun = async (scan: Scan): Promise<void> => {
  const client = createSanityClient();

  const perCategory: Array<
    { readonly category: Category; readonly results: ReadonlyArray<FileResult> }
  > = [];
  for (const { category, files } of scan.categories) {
    const results = await importCategory(client, category, files);
    perCategory.push({ category, results });
  }
  const allResults = perCategory.flatMap(({ results }) => results);

  const photoIdBySha = new Map<string, string>(
    allResults.flatMap((
      { file, photoId },
    ): ReadonlyArray<readonly [string, string]> =>
      photoId ? [[file.sha1, photoId]] : []
    ),
  );

  const failures: Array<Failure> = allResults.flatMap((
    { file, status, message },
  ) =>
    status === "failed"
      ? [{ path: file.path, message: message ?? "unknown error" }]
      : []
  );

  const aboutStatus = await (async (): Promise<string> => {
    if (scan.about === null) return "folder missing, not changed";
    try {
      return `set (${await importAbout(client, scan.about[0])})`;
    } catch (error) {
      failures.push({ path: scan.about[0].path, message: errorMessage(error) });
      return "failed";
    }
  })();

  const carouselStatus = await (async (): Promise<string> => {
    if (scan.carousel === null) return "folder missing, not changed";
    const carouselFiles = scan.carousel;
    try {
      const ids = await Promise.all(
        carouselFiles.map((file) =>
          resolveCarouselPhotoId(client, file, photoIdBySha)
        ),
      );
      const missing = carouselFiles.filter((_, index) => ids[index] === null);
      if (missing.length > 0) {
        missing.forEach((file) =>
          failures.push({
            path: file.path,
            message: "no matching photo for carousel file",
          })
        );
        return `NOT set (${missing.length} file(s) without a matching photo)`;
      }
      const photoIds = ids.filter((id): id is string => typeof id === "string");
      await saveCarousel(photoIds);
      return `set (${photoIds.length} photos)`;
    } catch (error) {
      failures.push({ path: "carousel", message: errorMessage(error) });
      return "failed";
    }
  })();

  console.log("");
  perCategory.forEach(({ category, results }) =>
    console.log(
      `${category}: ${countStatus(results, "created")} created, ${
        countStatus(results, "skipped")
      } skipped, ${countStatus(results, "failed")} failed`,
    )
  );
  console.log(`about: ${aboutStatus}`);
  console.log(`carousel: ${carouselStatus}`);
  console.log("Refresh the cache: POST /api/cache/refresh");

  if (failures.length === 0) return;
  console.error(`\n${failures.length} failure(s):`);
  failures.forEach(({ path, message }) =>
    console.error(`  ${path}: ${message}`)
  );
  Deno.exit(1);
};

const scan = await scanRoot();
validateAbout(scan);

if (confirm) {
  await confirmRun(scan);
} else {
  dryRun(scan);
}
