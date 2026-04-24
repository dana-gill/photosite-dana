import Sortable from "sortablejs";
import { useEffect, useRef, useState } from "preact/hooks";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface StagedFile {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
}

const buildStagedFile = (file: File): StagedFile => ({
  id: `${file.name}-${file.size}-${file.lastModified}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

const toSlug = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const refreshCache = async (): Promise<void> => {
  await fetch("/api/admin/cache/refresh", { method: "POST" });
};

const uploadPhoto = async (albumId: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/admin/albums/${albumId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? "Upload failed");
  }
};

export default function CreateAlbumForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [stagedFiles, setStagedFiles] = useState<ReadonlyArray<StagedFile>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(
    null,
  );
  const sortableListRef = useRef<HTMLUListElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  useEffect(() => {
    if (!sortableListRef.current || stagedFiles.length === 0) return;

    sortableRef.current?.destroy();
    sortableRef.current = Sortable.create(sortableListRef.current, {
      animation: 150,
      onEnd: () => {
        if (!sortableListRef.current) return;
        const nodes = Array.from(
          sortableListRef.current.querySelectorAll("[data-id]"),
        );
        setStagedFiles((prev) =>
          nodes.map((node) => {
            const id = node.getAttribute("data-id") ?? "";
            return prev.find((f) => f.id === id) ?? prev[0];
          })
        );
      },
    });

    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, [stagedFiles.length]);

  const addFiles = (files: ReadonlyArray<File>) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    setStagedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const newFiles = imageFiles
        .map(buildStagedFile)
        .filter((f) => !existingIds.has(f.id));
      return [...prev, ...newFiles];
    });
  };

  const removeFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    addFiles(files);
  };

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    addFiles(Array.from(input.files ?? []));
    input.value = "";
  };

  const handleTitleChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
  };

  const handleSlugChange = (e: Event) => {
    setSlug((e.target as HTMLInputElement).value);
    setSlugManuallyEdited(true);
  };

  const handleDescriptionChange = (e: Event) => {
    setDescription((e.target as HTMLTextAreaElement).value);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    setUploadProgress(null);

    const albumResponse = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, description }),
    });

    if (!albumResponse.ok) {
      const body = await albumResponse.json();
      setErrorMessage(body.error ?? "Failed to create album.");
      setStatus("error");
      return;
    }

    const albumBody = await albumResponse.json();
    const albumId: string = albumBody.data._id;

    if (stagedFiles.length > 0) {
      await stagedFiles.reduce<Promise<void>>(async (chain, staged, index) => {
        await chain;
        setUploadProgress(
          `Uploading photo ${index + 1} of ${stagedFiles.length}…`,
        );
        await uploadPhoto(albumId, staged.file);
      }, Promise.resolve());
    }

    setUploadProgress("Refreshing cache…");
    await refreshCache();

    setCreatedDocumentId(albumId);
    setTitle("");
    setSlug("");
    setSlugManuallyEdited(false);
    setDescription("");
    setStagedFiles([]);
    setUploadProgress(null);
    setStatus("success");
  };

  const isSubmitting = status === "submitting";

  return (
    <div class="bg-white border border-gray-200 rounded p-6 mt-8">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Create album</h2>
      {status === "success" && createdDocumentId && (
        <div class="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Album created.{" "}
          <a href={`/admin/albums/${createdDocumentId}`} class="underline">
            Open album
          </a>
        </div>
      )}
      <form onSubmit={handleSubmit} class="flex flex-col gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="album-title"
          >
            Title
          </label>
          <input
            id="album-title"
            type="text"
            value={title}
            onInput={handleTitleChange}
            required
            disabled={isSubmitting}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="album-slug"
          >
            Slug
          </label>
          <input
            id="album-slug"
            type="text"
            value={slug}
            onInput={handleSlugChange}
            required
            pattern="[a-z0-9-]+"
            disabled={isSubmitting}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          />
          <p class="text-xs text-gray-400 mt-1">
            Lowercase letters, numbers, hyphens only
          </p>
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="album-description"
          >
            Description
          </label>
          <textarea
            id="album-description"
            value={description}
            onInput={handleDescriptionChange}
            rows={2}
            disabled={isSubmitting}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          />
        </div>
        <div>
          <p class="block text-sm font-medium text-gray-700 mb-1">Photos</p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            class={`border-2 border-dashed rounded px-4 py-6 text-center text-sm transition-colors ${
              isDragOver
                ? "border-gray-500 bg-gray-50"
                : "border-gray-300 text-gray-400"
            } ${
              isSubmitting ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            <p>Drag photos here</p>
            <p class="mt-1">
              or{" "}
              <label class="underline cursor-pointer">
                browse
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  disabled={isSubmitting}
                  class="sr-only"
                />
              </label>
            </p>
          </div>
          {stagedFiles.length > 0 && (
            <ul
              ref={sortableListRef}
              class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3"
            >
              {stagedFiles.map((staged) => (
                <li
                  key={staged.id}
                  data-id={staged.id}
                  class="relative cursor-grab select-none rounded overflow-hidden border border-gray-200"
                >
                  <img
                    src={staged.previewUrl}
                    alt={staged.file.name}
                    class="w-full h-20 object-cover"
                  />
                  {!isSubmitting && (
                    <button
                      type="button"
                      onClick={() => removeFile(staged.id)}
                      class="absolute top-0.5 right-0.5 bg-white rounded-full w-5 h-5 text-xs text-gray-600 hover:text-red-600 flex items-center justify-center shadow"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {stagedFiles.length > 0 && (
            <p class="text-xs text-gray-400 mt-1">
              Drag to reorder before creating.
            </p>
          )}
        </div>
        {status === "error" && errorMessage && (
          <p class="text-sm text-red-600">{errorMessage}</p>
        )}
        {uploadProgress && <p class="text-sm text-gray-500">{uploadProgress}
        </p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            class="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create album"}
          </button>
        </div>
      </form>
    </div>
  );
}
