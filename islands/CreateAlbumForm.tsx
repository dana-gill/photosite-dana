import { useState } from "preact/hooks";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function CreateAlbumForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);

  const handleTitleChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setTitle(value);
    if (!slug) {
      setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  const handleSlugChange = (e: Event) => {
    setSlug((e.target as HTMLInputElement).value);
  };

  const handleDescriptionChange = (e: Event) => {
    setDescription((e.target as HTMLTextAreaElement).value);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const response = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, description }),
    });

    if (!response.ok) {
      const body = await response.json();
      setErrorMessage(body.error ?? "Failed to create album.");
      setStatus("error");
      return;
    }

    const body = await response.json();
    setCreatedDocumentId(body.data.documentId);
    setTitle("");
    setSlug("");
    setDescription("");
    setStatus("success");
  };

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
          <label class="block text-sm font-medium text-gray-700 mb-1" htmlFor="album-title">
            Title
          </label>
          <input
            id="album-title"
            type="text"
            value={title}
            onInput={handleTitleChange}
            required
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" htmlFor="album-slug">
            Slug
          </label>
          <input
            id="album-slug"
            type="text"
            value={slug}
            onInput={handleSlugChange}
            required
            pattern="[a-z0-9-]+"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <p class="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" htmlFor="album-description">
            Description
          </label>
          <textarea
            id="album-description"
            value={description}
            onInput={handleDescriptionChange}
            rows={2}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        {status === "error" && errorMessage && (
          <p class="text-sm text-red-600">{errorMessage}</p>
        )}
        <div>
          <button
            type="submit"
            disabled={status === "submitting"}
            class="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {status === "submitting" ? "Creating…" : "Create album"}
          </button>
        </div>
      </form>
    </div>
  );
}
