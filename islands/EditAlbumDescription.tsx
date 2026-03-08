import { useState } from "preact/hooks";

type EditStatus = "idle" | "editing" | "saving" | "error";

interface EditAlbumDescriptionProps {
  readonly documentId: string;
  readonly initialDescription: string | null;
}

export default function EditAlbumDescription(
  { documentId, initialDescription }: EditAlbumDescriptionProps,
) {
  const [status, setStatus] = useState<EditStatus>("idle");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [savedDescription, setSavedDescription] = useState(initialDescription ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEdit = () => {
    setStatus("editing");
    setErrorMessage(null);
  };

  const handleCancel = () => {
    setDescription(savedDescription);
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setStatus("saving");
    setErrorMessage(null);

    const response = await fetch(`/api/admin/albums/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      const body = await response.json();
      setErrorMessage(body.error ?? "Failed to save description.");
      setStatus("error");
      return;
    }

    setSavedDescription(description);
    setStatus("idle");
  };

  const handleInput = (e: Event) => {
    setDescription((e.target as HTMLTextAreaElement).value);
  };

  if (status === "editing" || status === "saving" || status === "error") {
    return (
      <div class="mt-1">
        <textarea
          value={description}
          onInput={handleInput}
          rows={2}
          disabled={status === "saving"}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
        />
        {errorMessage && (
          <p class="text-xs text-red-600 mt-1">{errorMessage}</p>
        )}
        <div class="flex gap-3 mt-2">
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
    <div class="flex items-start gap-2 mt-1">
      <p class="text-gray-500 text-sm">
        {savedDescription || <span class="italic text-gray-400">No description</span>}
      </p>
      <button
        type="button"
        onClick={handleEdit}
        class="text-xs text-gray-400 hover:text-gray-700 mt-0.5 shrink-0"
      >
        Edit
      </button>
    </div>
  );
}
