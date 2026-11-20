// WARNING: DESTRUCTIVE. With --confirm this script permanently deletes all
// `photo` and `album` documents (drafts included) and all unreferenced image
// assets in the dataset. The `about` document and its image are kept.
//
// Export a backup first:
//   npx sanity dataset export production backup-<date>.tar.gz
//
// Usage: deno run -A --env scripts/reset-sanity-content.ts [--confirm]
// Without --confirm the script is a read-only dry run.
import { createClient } from "@sanity/client";
import type { SanityClient } from "@sanity/client";

const BATCH_SIZE = 100;
const CAROUSEL_IDS: ReadonlyArray<string> = ["carousel", "drafts.carousel"];
const ABOUT_IDS: ReadonlyArray<string> = ["about", "drafts.about"];

const projectId = Deno.env.get("SANITY_PROJECT_ID");
const apiToken = Deno.env.get("SANITY_API_TOKEN");
const dataset = Deno.env.get("SANITY_DATASET") ?? "production";

if (!projectId || !apiToken) {
  console.error(
    "SANITY_PROJECT_ID and SANITY_API_TOKEN env vars are required.",
  );
  Deno.exit(1);
}

const client: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-03-14",
  token: apiToken,
  useCdn: false,
  perspective: "raw",
});

const chunk = <T>(
  items: ReadonlyArray<T>,
  size: number,
): ReadonlyArray<ReadonlyArray<T>> =>
  Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, (index + 1) * size),
  );

const unique = (items: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(items));

const fetchIds = (
  query: string,
  params: Record<string, unknown> = {},
): Promise<ReadonlyArray<string>> =>
  client.fetch<ReadonlyArray<string>>(query, params);

const fetchDocIds = (types: ReadonlyArray<string>) =>
  fetchIds(`*[_type in $types]._id`, { types });

const fetchCarouselRefCount = async (): Promise<number> => {
  const counts = await Promise.all(
    CAROUSEL_IDS.map((id) =>
      client.fetch<number | null>(
        `count(*[_id == $id][0].images)`,
        { id },
      )
    ),
  );
  return counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
};

const fetchExistingCarouselIds = (): Promise<ReadonlyArray<string>> =>
  fetchIds(`*[_id in $ids]._id`, { ids: CAROUSEL_IDS });

const fetchKeepAssetIds = async (): Promise<ReadonlyArray<string>> => {
  const [referenced, aboutAssets] = await Promise.all([
    fetchIds(
      `*[!(_type in ["photo","album","sanity.imageAsset","sanity.fileAsset"]) && defined(image.asset._ref)].image.asset._ref`,
    ),
    fetchIds(
      `*[_id in $ids && defined(image.asset._ref)].image.asset._ref`,
      { ids: ABOUT_IDS },
    ),
  ]);
  return unique([...referenced, ...aboutAssets]);
};

const fetchAboutFilename = async (): Promise<string> => {
  const about = await client.fetch<{ name: string | null } | null>(
    `*[_id == "about"][0]{ "name": image.asset->originalFilename }`,
  );
  if (about === null) return "none";
  return about.name ?? "unknown file";
};

const fetchPurgeableAssetIds = (
  keep: ReadonlyArray<string>,
): Promise<ReadonlyArray<string>> =>
  fetchIds(
    `*[_type == "sanity.imageAsset" && count(*[references(^._id)]) == 0 && !(_id in $keep)]._id`,
    { keep },
  );

const fetchAllImageAssetIds = (): Promise<ReadonlyArray<string>> =>
  fetchIds(`*[_type == "sanity.imageAsset"]._id`);

const deleteInBatches = async (
  ids: ReadonlyArray<string>,
  label: string,
): Promise<{ readonly deleted: number; readonly failed: number }> => {
  let deleted = 0;
  let failed = 0;
  for (const batch of chunk(ids, BATCH_SIZE)) {
    try {
      await batch
        .reduce((tx, id) => tx.delete(id), client.transaction())
        .commit();
      deleted += batch.length;
    } catch (error) {
      failed += batch.length;
      console.error(
        `Failed to delete ${batch.length} ${label}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return { deleted, failed };
};

const dryRun = async (): Promise<void> => {
  const [photoIds, albumIds, carouselRefs, allAssets, keep, aboutName] =
    await Promise.all([
      fetchDocIds(["photo"]),
      fetchDocIds(["album"]),
      fetchCarouselRefCount(),
      fetchAllImageAssetIds(),
      fetchKeepAssetIds(),
      fetchAboutFilename(),
    ]);
  const purge = allAssets.filter((id) => !keep.includes(id));

  console.log(`Dataset: ${dataset}`);
  console.log(`album docs: ${albumIds.length}`);
  console.log(`photo docs (drafts included): ${photoIds.length}`);
  console.log(`carousel refs: ${carouselRefs}`);
  console.log(`unreferenced image assets to delete: ${purge.length}`);
  console.log(`kept: about (${aboutName})`);
  console.log("Dry run. Re-run with --confirm to delete.");
};

const confirmRun = async (): Promise<void> => {
  const carouselIds = await fetchExistingCarouselIds();
  await Promise.all(
    carouselIds.map((id) => client.patch(id).unset(["images"]).commit()),
  );
  console.log(`Cleared carousel images on ${carouselIds.length} doc(s).`);

  const photoIds = await fetchDocIds(["photo"]);
  const photos = await deleteInBatches(photoIds, "photos");

  const albumIds = await fetchDocIds(["album"]);
  const albums = await deleteInBatches(albumIds, "albums");

  const keep = await fetchKeepAssetIds();
  const assetIds = await fetchPurgeableAssetIds(keep);
  const assets = await deleteInBatches(assetIds, "image assets");

  console.log(
    `Deleted: ${photos.deleted} photos, ${albums.deleted} albums, ${assets.deleted} image assets.`,
  );
  const failures = photos.failed + albums.failed + assets.failed;
  if (failures === 0) return;
  console.error(`${failures} deletes failed.`);
  Deno.exit(1);
};

if (Deno.args.includes("--confirm")) {
  await confirmRun();
} else {
  await dryRun();
}
