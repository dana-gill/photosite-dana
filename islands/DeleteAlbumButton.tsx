import { useState } from "preact/hooks";

type DeleteStatus = "idle" | "confirming" | "deleting" | "error";

interface DeleteAlbumButtonProps {
  readonly documentId: string;
  readonly title: string;
}

export default function DeleteAlbumButton({ documentId, title }: DeleteAlbumButtonProps) {
  const [status, setStatus] = useState<DeleteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteClick = () => {
    setStatus("confirming");
  };

  const handleCancel = () => {
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    setStatus("deleting");
    setErrorMessage(null);

    const response = await fetch(`/api/admin/albums/${documentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = await response.json();
      setErrorMessage(body.error ?? "Failed to delete album.");
      setStatus("error");
      return;
    }

    globalThis.location.href = "/admin";
  };

  if (status === "confirming" || status === "deleting" || status === "error") {
    return (
      <div class="flex items-center gap-2">
        {errorMessage && (
          <span class="text-xs text-red-600">{errorMessage}</span>
        )}
        <span class="text-sm text-gray-700">Delete "{title}"?</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={status === "deleting"}
          class="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {status === "deleting" ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={status === "deleting"}
          class="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDeleteClick}
      class="text-sm text-gray-400 hover:text-red-600 transition-colors"
    >
      Delete
    </button>
  );
}
