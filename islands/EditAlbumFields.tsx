import { useState } from "preact/hooks";

type EditStatus = "idle" | "editing" | "saving" | "error";

interface EditAlbumFieldsProps {
  readonly albumId: string;
  readonly initialTitle: string;
  readonly initialDescription: string | null;
}

export default function EditAlbumFields(
  { albumId, initialTitle, initialDescription }: EditAlbumFieldsProps,
) {
  const [status, setStatus] = useState<EditStatus>("idle");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedDescription, setSavedDescription] = useState(initialDescription ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEdit = () => {
    setStatus("editing");
    setErrorMessage(null);
  };

  const handleCancel = () => {
    setTitle(savedTitle);
    setDescription(savedDescription);
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage("Title is required.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    const response = await fetch(`/api/admin/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    if (!response.ok) {
      const body = await response.json();
      setErrorMessage(body.error ?? "Failed to save.");
      setStatus("error");
      return;
    }

    setSavedTitle(title);
    setSavedDescription(description);
    setStatus("idle");
  };

  const handleTitleInput = (e: Event) => {
    setTitle((e.target as HTMLInputElement).value);
  };

  const handleDescriptionInput = (e: Event) => {
    setDescription((e.target as HTMLTextAreaElement).value);
  };

  if (status === "editing" || status === "saving" || status === "error") {
    return (
      <div class="flex flex-col gap-3 mt-2">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={handleTitleInput}
            disabled={status === "saving"}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onInput={handleDescriptionInput}
            rows={2}
            disabled={status === "saving"}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          />
        </div>
        {errorMessage && (
          <p class="text-xs text-red-600">{errorMessage}</p>
        )}
        <div class="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            class="text-sm text-gray-900 hover:underline disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={status === "saving"}
            class="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="mt-2">
      <div class="flex items-start gap-2">
        <h1 class="text-2xl font-semibold text-gray-900">{savedTitle}</h1>
        <button
          type="button"
          onClick={handleEdit}
          class="text-xs text-gray-600 hover:text-gray-900 mt-1.5 shrink-0"
        >
          Edit
        </button>
      </div>
      <p class="text-gray-500 mt-1 text-sm">
        {savedDescription || <span class="italic text-gray-400">No description</span>}
      </p>
    </div>
  );
}
