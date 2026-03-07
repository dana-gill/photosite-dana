import type { StrapiPhoto } from "../types/album.ts";
import { useEffect, useRef, useState } from "preact/hooks";

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

  useEffect(() => {
    if (!listRef.current) return;

    // deno-lint-ignore no-explicit-any
    let sortableInstance: any = null;

    import("https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js").then((mod) => {
      const Sortable = mod.default ?? mod;
      sortableInstance = Sortable.create(listRef.current, {
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
    });

    return () => {
      sortableInstance?.destroy();
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch(
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

    if (!response.ok) {
      setError("Failed to save order. Please try again.");
      return;
    }

    setSaved(true);
  };

  return (
    <div>
      <ul ref={listRef} class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
        {items.map((photo) => (
          <li
            key={photo.documentId}
            data-id={photo.documentId}
            class="cursor-grab bg-white border border-gray-200 rounded overflow-hidden select-none"
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
          </li>
        ))}
      </ul>
      <div class="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
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
