import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";
import type { CarouselEntry, SanityPhoto } from "../types/sanity.ts";
import { CAROUSEL_LIBRARY_PAGE_SIZE } from "./consts.ts";

interface CarouselEditorProps {
  readonly allPhotos: ReadonlyArray<SanityPhoto>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}

interface CarouselItem {
  readonly photoId: string;
  readonly thumbnailUrl: string;
  readonly label: string;
}

const toCarouselItem = (photo: SanityPhoto): CarouselItem => ({
  photoId: photo._id,
  thumbnailUrl: photo.image.asset.url,
  label: photo.altTitle ?? photo.caption ?? photo._id,
});

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
    initialEntries
      .map((entry) => photoMap.get(entry.photoId))
      .filter((p): p is SanityPhoto => p !== undefined)
      .map(toCarouselItem),
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/admin/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: items.map((item) => ({ photoId: item.photoId })),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Failed to save. Please try again.");
      return;
    }

    setSaved(true);
  };

  const carouselIds = new Set(items.map((item) => item.photoId));
  const totalPages = Math.ceil(allPhotos.length / CAROUSEL_LIBRARY_PAGE_SIZE);
  const pagePhotos = allPhotos.slice(
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
                <img
                  src={item.thumbnailUrl}
                  alt={item.label}
                  class="w-full h-28 object-cover"
                />
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
          <h2 class="text-sm font-medium text-gray-700">All Photos</h2>
          {renderPagination(
            libraryPage,
            totalPages,
            handlePrevPage,
            handleNextPage,
          )}
        </div>

        <ul class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pagePhotos.map((photo) =>
            renderLibraryPhotoButton(photo, carouselIds.has(photo._id), handleAdd)
          )}
        </ul>
      </section>
    </div>
  );
}
