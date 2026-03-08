import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";
import type { CarouselEntry } from "../types/carousel.ts";
import type { StrapiImage } from "../types/strapi.ts";

interface CarouselEditorProps {
  readonly allImages: ReadonlyArray<StrapiImage>;
  readonly initialEntries: ReadonlyArray<CarouselEntry>;
}

interface CarouselItem {
  readonly imageId: number;
  readonly name: string;
  readonly thumbnailUrl: string;
}

const toCarouselItem = (image: StrapiImage): CarouselItem => ({
  imageId: image.id,
  name: image.name,
  thumbnailUrl: image.formats?.thumbnail?.url ?? image.url,
});

export default function CarouselEditor({ allImages, initialEntries }: CarouselEditorProps) {
  const imageMap = new Map(allImages.map((img) => [img.id, img]));

  const [items, setItems] = useState<CarouselItem[]>(
    initialEntries
      .map((entry) => imageMap.get(entry.imageId))
      .filter((img) => img !== undefined)
      .map(toCarouselItem),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

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
            const id = Number(node.getAttribute("data-id"));
            return prev.find((item) => item.imageId === id) ?? prev[0];
          })
        );
      },
    });

    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, []);

  const handleAdd = () => {
    if (selectedImageId === null) return;
    const image = imageMap.get(selectedImageId);
    if (!image) return;
    const alreadyAdded = items.some((item) => item.imageId === selectedImageId);
    if (alreadyAdded) return;
    setItems((prev) => [...prev, toCarouselItem(image)]);
    setSelectedImageId(null);
    setSaved(false);
  };

  const handleRemove = (imageId: number) => {
    setItems((prev) => prev.filter((item) => item.imageId !== imageId));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/admin/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: items.map((item) => ({ imageId: item.imageId })) }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Failed to save. Please try again.");
      return;
    }

    setSaved(true);
  };

  const availableImages = allImages.filter(
    (img) => !items.some((item) => item.imageId === img.id),
  );

  return (
    <div>
      <ul ref={listRef} class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
        {items.map((item) => (
          <li
            key={item.imageId}
            data-id={item.imageId}
            class="relative bg-white border border-gray-200 rounded overflow-hidden select-none cursor-grab"
          >
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              class="w-full h-32 object-cover"
            />
            <p class="text-xs text-gray-500 px-2 py-1 truncate">{item.name}</p>
            <button
              type="button"
              onClick={() => handleRemove(item.imageId)}
              class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white text-xs rounded"
              aria-label="Remove from carousel"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div class="flex items-center gap-2 mb-6">
        <select
          class="border border-gray-300 rounded px-3 py-2 text-sm flex-1 max-w-sm"
          value={selectedImageId ?? ""}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            setSelectedImageId(val ? Number(val) : null);
          }}
        >
          <option value="">— select an image to add —</option>
          {availableImages.map((img) => (
            <option key={img.id} value={img.id}>
              {img.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={selectedImageId === null}
          class="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div class="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
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
