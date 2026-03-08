import type { StrapiPhoto } from "../types/album.ts";
import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";

export const UPLOAD_START_EVENT = "photo-upload-start";
export const UPLOAD_END_EVENT = "photo-upload-end";

interface AlbumPhotoSorterProps {
  readonly albumDocumentId: string;
  readonly photos: ReadonlyArray<StrapiPhoto>;
}

interface SortablePhoto {
  readonly documentId: string;
  readonly imageUrl: string;
  readonly altTitle: string | null;
  readonly caption: string | null;
  order: number;
}

export default function AlbumPhotoSorter({ albumDocumentId, photos }: AlbumPhotoSorterProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const [items, setItems] = useState<SortablePhoto[]>(
    photos.map((p) => ({
      documentId: p.documentId,
      imageUrl: p.image.formats?.thumbnail?.url ?? p.image.url,
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
            const docId = node.getAttribute("data-id") ?? "";
            const found = prev.find((p) => p.documentId === docId);
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

  const handleDelete = (photoDocumentId: string) => {
    setPendingDeletes((prev) => [...prev, photoDocumentId]);
    setItems((prev) => prev.filter((p) => p.documentId !== photoDocumentId));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const deleteResults = await Promise.all(
      pendingDeletes.map((photoDocumentId) =>
        fetch(
          `/api/admin/albums/${albumDocumentId}/photos?photoDocumentId=${encodeURIComponent(photoDocumentId)}`,
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
      `/api/admin/albums/${albumDocumentId}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: items.map((p) => ({ documentId: p.documentId, order: p.order })),
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
      <ul ref={listRef} class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
        {items.map((photo) => (
          <li
            key={photo.documentId}
            data-id={photo.documentId}
            class={`relative bg-white border border-gray-200 rounded overflow-hidden select-none ${uploadingDisabled ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
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
              onClick={() => handleDelete(photo.documentId)}
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
