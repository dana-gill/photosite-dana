import type { SanityPhoto } from "../types/sanity.ts";
import type { Category } from "../types/category.ts";
import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";
import { UPLOAD_END_EVENT, UPLOAD_START_EVENT } from "./consts.ts";

interface PhotoSorterProps {
  readonly category: Category;
  readonly photos: ReadonlyArray<SanityPhoto>;
}

const moveItem = (
  items: ReadonlyArray<SanityPhoto>,
  from: number,
  to: number,
): ReadonlyArray<SanityPhoto> => {
  const moved = items[from];
  if (moved === undefined) return items;
  const rest = items.filter((_, index) => index !== from);
  return [...rest.slice(0, to), moved, ...rest.slice(to)];
};

export default function PhotoSorter({ category, photos }: PhotoSorterProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const [items, setItems] = useState<ReadonlyArray<SanityPhoto>>(photos);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDisabled, setUploadingDisabled] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<ReadonlyArray<string>>(
    [],
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    sortableRef.current = Sortable.create(list, {
      animation: 150,
      draggable: "li",
      filter: "button",
      onEnd: (evt) => {
        const { oldIndex, newIndex, item, from } = evt;
        if (oldIndex === undefined || newIndex === undefined) return;
        // Undo Sortable's DOM move so Preact keeps ownership of the list.
        from.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] ?? null);
        setItems((prev) => moveItem(prev, oldIndex, newIndex));
        setSaved(false);
      },
    });

    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleUploadStart = () => {
      setUploadingDisabled(true);
      sortableRef.current?.option("disabled", true);
    };
    const handleUploadEnd = () => {
      setUploadingDisabled(false);
      sortableRef.current?.option("disabled", false);
    };

    globalThis.addEventListener(UPLOAD_START_EVENT, handleUploadStart);
    globalThis.addEventListener(UPLOAD_END_EVENT, handleUploadEnd);

    return () => {
      globalThis.removeEventListener(UPLOAD_START_EVENT, handleUploadStart);
      globalThis.removeEventListener(UPLOAD_END_EVENT, handleUploadEnd);
    };
  }, []);

  const handleMove = (index: number, to: number) => {
    setItems((prev) => moveItem(prev, index, to));
    setSaved(false);
  };

  const handleDelete = (photoId: string) => {
    setPendingDeletes((prev) => [...prev, photoId]);
    setItems((prev) => prev.filter((p) => p._id !== photoId));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const reorderResponse = await fetch(
      `/api/admin/categories/${category}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoIds: items.map((p) => p._id),
          deleteIds: pendingDeletes,
        }),
      },
    ).catch(() => null).finally(() => setSaving(false));

    if (reorderResponse === null) {
      setError("Network error. Please try again.");
      return;
    }

    if (reorderResponse.status === 409) {
      setError("Photos changed. Reload the page.");
      return;
    }

    if (!reorderResponse.ok) {
      setError("Failed to save order. Please try again.");
      return;
    }

    setPendingDeletes([]);
    setSaved(true);
  };

  const lastIndex = items.length - 1;

  return (
    <div>
      <ul
        ref={listRef}
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6"
      >
        {items.map((photo, index) => (
          <li
            key={photo._id}
            data-id={photo._id}
            class={`relative bg-white border border-gray-200 rounded overflow-hidden select-none ${
              uploadingDisabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-grab"
            }`}
          >
            <img
              src={photo.image.asset.url}
              alt={photo.altTitle ?? photo.caption ?? ""}
              class="w-full h-32 object-cover"
            />
            <span class="absolute top-1 left-1 min-w-6 h-6 px-1 flex items-center justify-center bg-black/60 text-white text-xs rounded">
              {index + 1}
            </span>
            {(photo.altTitle ?? photo.caption) && (
              <p class="text-xs text-gray-500 px-2 py-1 truncate">
                {photo.altTitle ?? photo.caption}
              </p>
            )}
            <div class="flex gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={() => handleMove(index, 0)}
                disabled={uploadingDisabled || index === 0}
                class="flex-1 px-1 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Move to top
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, lastIndex)}
                disabled={uploadingDisabled || index === lastIndex}
                class="flex-1 px-1 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Move to bottom
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(photo._id)}
              disabled={uploadingDisabled}
              class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white text-xs rounded disabled:opacity-50"
              aria-label="Delete photo"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div class="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploadingDisabled}
          class="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
        {saved && <span class="text-sm text-green-600">Saved!</span>}
        {error && <span class="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
