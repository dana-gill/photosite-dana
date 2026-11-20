import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";
import type { CarouselEntry, SanityPhoto } from "../types/sanity.ts";
import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
} from "../types/category.ts";
import { CAROUSEL_LIBRARY_PAGE_SIZE } from "./consts.ts";

interface CarouselEditorProps {
  readonly allPhotos: ReadonlyArray<SanityPhoto>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}

interface CarouselItem {
  readonly photoId: string;
  readonly thumbnailUrl: string | null;
  readonly label: string;
  readonly category: Category | null;
}

const toCarouselItem = (photo: SanityPhoto): CarouselItem => ({
  photoId: photo._id,
  thumbnailUrl: photo.image.asset.url,
  label: photo.altTitle ?? photo.caption ?? photo._id,
  category: photo.category,
});

const toMissingItem = (photoId: string): CarouselItem => ({
  photoId,
  thumbnailUrl: null,
  label: "Missing photo",
  category: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readErrorMessage = async (response: Response): Promise<string> => {
  const fallback = "Failed to save. Please try again.";
  if (response.status !== 400) return fallback;
  const body: unknown = await response.json().catch(() => null);
  if (isRecord(body) && typeof body.error === "string") return body.error;
  return fallback;
};

const renderCategoryBadge = (category: Category) => (
  <span class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
    {CATEGORY_LABELS[category]}
  </span>
);

const renderCarouselEmpty = () => (
  <p class="text-sm text-gray-400 italic py-6 border border-dashed border-gray-200 rounded text-center">
    No images in carousel — click images below to add them.
  </p>
);

const renderLibraryPhotoButton = (
  photo: SanityPhoto,
  inCarousel: boolean,
  onAdd: (id: string) => void,
) => {
  const thumbnailUrl = photo.image.asset.url;
  const buttonClass =
    `w-full relative rounded overflow-hidden border transition-opacity ${
      inCarousel
        ? "border-gray-200 opacity-30 cursor-default"
        : "border-transparent hover:border-gray-400 cursor-pointer"
    }`;
  const label = photo.altTitle ?? photo.caption ?? photo._id;
  const ariaLabel = inCarousel
    ? `${label} (already in carousel)`
    : `Add ${label} to carousel`;

  return (
    <li key={photo._id}>
      <button
        type="button"
        onClick={() => onAdd(photo._id)}
        disabled={inCarousel}
        class={buttonClass}
        aria-label={ariaLabel}
      >
        <img
          src={thumbnailUrl}
          alt={label}
          class="w-full h-28 object-cover"
        />
        {!inCarousel && (
          <div class="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
        )}
        {renderCategoryBadge(photo.category)}
      </button>
    </li>
  );
};

const renderPagination = (
  libraryPage: number,
  totalPages: number,
  onPrev: () => void,
  onNext: () => void,
) => {
  if (totalPages <= 1) return null;
  return (
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <button
        type="button"
        onClick={onPrev}
        disabled={libraryPage === 0}
        class="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        ‹
      </button>
      <span>{libraryPage + 1} / {totalPages}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={libraryPage === totalPages - 1}
        class="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
};

export default function CarouselEditor(
  { allPhotos, initialEntries }: CarouselEditorProps,
) {
  const photoMap = new Map(allPhotos.map((p) => [p._id, p]));

  const [items, setItems] = useState<CarouselItem[]>(
    initialEntries.map((entry) => {
      const photo = photoMap.get(entry.photoId);
      return photo === undefined
        ? toMissingItem(entry.photoId)
        : toCarouselItem(photo);
    }),
  );
  const [activeCategory, setActiveCategory] = useState<Category>(
    CATEGORIES[0],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryPage, setLibraryPage] = useState(0);

  const listRef = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  useEffect(() => {
    if (!listRef.current) return;

    sortableRef.current = Sortable.create(listRef.current, {
      animation: 150,
      onEnd: () => {
        if (!listRef.current) return;
        const nodes = Array.from(listRef.current.querySelectorAll("[data-id]"));
        setItems((prev) =>
          nodes.map((node) => {
            const id = node.getAttribute("data-id") ?? "";
            return prev.find((item) => item.photoId === id) ?? prev[0];
          })
        );
      },
    });

    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, []);

  const handleAdd = (photoId: string) => {
    const photo = photoMap.get(photoId);
    if (!photo) return;
    const alreadyAdded = items.some((item) => item.photoId === photoId);
    if (alreadyAdded) return;
    setItems((prev) => [...prev, toCarouselItem(photo)]);
    setSaved(false);
  };

  const handleRemove = (photoId: string) => {
    setItems((prev) => prev.filter((item) => item.photoId !== photoId));
    setSaved(false);
  };

  const saveItems = async (toSave: ReadonlyArray<CarouselItem>) => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/admin/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: toSave.map((item) => ({ photoId: item.photoId })),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError(await readErrorMessage(response));
      return;
    }

    setSaved(true);
  };

  const handleSave = () => saveItems(items);

  const handleRemoveMissing = () => {
    const remaining = items.filter((item) => item.thumbnailUrl !== null);
    setItems(remaining);
    return saveItems(remaining);
  };

  const handleSelectCategory = (category: Category) => {
    setActiveCategory(category);
    setLibraryPage(0);
  };

  const missingCount = items.filter((item) => item.thumbnailUrl === null)
    .length;
  const libraryPhotos = allPhotos
    .filter((photo) => photo.category === activeCategory)
    .sort((a, b) => a.order - b.order);

  const carouselIds = new Set(items.map((item) => item.photoId));
  const totalPages = Math.ceil(
    libraryPhotos.length / CAROUSEL_LIBRARY_PAGE_SIZE,
  );
  const pagePhotos = libraryPhotos.slice(
    libraryPage * CAROUSEL_LIBRARY_PAGE_SIZE,
    (libraryPage + 1) * CAROUSEL_LIBRARY_PAGE_SIZE,
  );

  const handleNextPage = () => {
    setLibraryPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const handlePrevPage = () => {
    setLibraryPage((prev) => Math.max(0, prev - 1));
  };

  return (
    <div class="space-y-8">
      <section>
        <h2 class="text-sm font-medium text-gray-700 mb-3">
          Carousel ({items.length} {items.length === 1 ? "image" : "images"})
        </h2>
        {missingCount > 0 && (
          <div class="flex items-center justify-between gap-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <span>{missingCount} carousel photos no longer exist</span>
            <button
              type="button"
              onClick={handleRemoveMissing}
              disabled={saving}
              class="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
            >
              Remove missing
            </button>
          </div>
        )}
        {items.length === 0 ? renderCarouselEmpty() : (
          <ul
            ref={listRef}
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
          >
            {items.map((item) => (
              <li
                key={item.photoId}
                data-id={item.photoId}
                class="relative bg-white border border-gray-200 rounded overflow-hidden select-none cursor-grab"
              >
                {item.thumbnailUrl === null || item.category === null
                  ? (
                    <div class="w-full h-28 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                      Missing photo
                    </div>
                  )
                  : (
                    <>
                      <img
                        src={item.thumbnailUrl}
                        alt={item.label}
                        class="w-full h-28 object-cover"
                      />
                      {renderCategoryBadge(item.category)}
                    </>
                  )}
                <button
                  type="button"
                  onClick={() => handleRemove(item.photoId)}
                  class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white text-xs rounded"
                  aria-label="Remove from carousel"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div class="flex items-center gap-4 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            class="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && <span class="text-sm text-green-600">Saved!</span>}
          {error && <span class="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      <section>
        <div class="flex items-center justify-between mb-3">
          <div role="tablist" class="flex gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={category === activeCategory}
                onClick={() => handleSelectCategory(category)}
                class={`px-3 py-1 text-sm rounded border ${
                  category === activeCategory
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
          {renderPagination(
            libraryPage,
            totalPages,
            handlePrevPage,
            handleNextPage,
          )}
        </div>

        <ul class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pagePhotos.map((photo) =>
            renderLibraryPhotoButton(
              photo,
              carouselIds.has(photo._id),
              handleAdd,
            )
          )}
        </ul>
      </section>
    </div>
  );
}
