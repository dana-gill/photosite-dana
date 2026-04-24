import type { SanityPhoto } from "../types/sanity.ts";
import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";
import { UPLOAD_END_EVENT, UPLOAD_START_EVENT } from "./consts.ts";

export { UPLOAD_END_EVENT, UPLOAD_START_EVENT };

interface AlbumPhotoSorterProps {
  readonly albumId: string;
  readonly photos: ReadonlyArray<SanityPhoto>;
}

interface SortablePhoto {
  readonly _id: string;
  readonly imageUrl: string;
  readonly altTitle: string | null;
  readonly caption: string | null;
  order: number;
}

export default function AlbumPhotoSorter(
  { albumId, photos }: AlbumPhotoSorterProps,
) {
  const listRef = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const [items, setItems] = useState<SortablePhoto[]>(
    photos.map((p) => ({
      _id: p._id,
      imageUrl: p.image.asset.url,
      altTitle: p.altTitle,
      caption: p.caption,
      order: p.order,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDisabled, setUploadingDisabled] = useState(false);

  useEffect(() => {
    if (!listRef.current) return;

    sortableRef.current = Sortable.create(listRef.current, {
      animation: 150,
      onEnd: () => {
        if (!listRef.current) return;
        const nodes = Array.from(listRef.current.querySelectorAll("[data-id]"));
        setItems((prev) =>
          nodes.map((node, index) => {
            const id = node.getAttribute("data-id") ?? "";
            const found = prev.find((p) => p._id === id);
            return { ...(found ?? prev[index]), order: index };
          })
        );
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

  const [pendingDeletes, setPendingDeletes] = useState<ReadonlyArray<string>>([]);

  const handleDelete = (photoId: string) => {
    setPendingDeletes((prev) => [...prev, photoId]);
    setItems((prev) => prev.filter((p) => p._id !== photoId));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const deleteResults = await Promise.all(
      pendingDeletes.map((photoId) =>
        fetch(
          `/api/admin/albums/${albumId}/photos?photoDocumentId=${encodeURIComponent(photoId)}`,
          { method: "DELETE" },
        )
      ),
    );

    if (deleteResults.some((r) => !r.ok)) {
      setSaving(false);
      setError("Failed to delete one or more photos. Please try again.");
      return;
    }

    const reorderResponse = await fetch(
      `/api/admin/albums/${albumId}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: items.map((p) => ({
            _id: p._id,
            order: p.order,
          })),
        }),
      },
    );

    setSaving(false);

    if (!reorderResponse.ok) {
      setError("Failed to save order. Please try again.");
      return;
    }

    setPendingDeletes([]);
    setSaved(true);
  };

  return (
    <div>
      <ul
        ref={listRef}
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6"
      >
        {items.map((photo) => (
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
              src={photo.imageUrl}
              alt={photo.altTitle ?? photo.caption ?? ""}
              class="w-full h-32 object-cover"
            />
            {(photo.altTitle ?? photo.caption) && (
              <p class="text-xs text-gray-500 px-2 py-1 truncate">
                {photo.altTitle ?? photo.caption}
              </p>
            )}
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
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span class="text-sm text-green-600">Saved!</span>}
        {error && <span class="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
