import { useState } from "preact/hooks";
import { UPLOAD_END_EVENT, UPLOAD_START_EVENT } from "./AlbumPhotoSorter.tsx";

interface PhotoUploaderProps {
  readonly albumDocumentId: string;
}

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface FileUploadState {
  readonly file: File;
  readonly status: UploadStatus;
  readonly errorMessage: string | null;
}

const buildInitialState = (file: File): FileUploadState => ({
  file,
  status: "pending",
  errorMessage: null,
});

const refreshCache = async (): Promise<void> => {
  await fetch("/api/admin/cache/refresh", { method: "POST" });
};

const uploadFile = async (albumDocumentId: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/admin/albums/${albumDocumentId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? "Upload failed");
  }
};

export default function PhotoUploader({ albumDocumentId }: PhotoUploaderProps) {
  const [uploads, setUploads] = useState<ReadonlyArray<FileUploadState>>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    setUploads(files.map(buildInitialState));
  };

  const setFileStatus = (index: number, status: UploadStatus, errorMessage: string | null) => {
    setUploads((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, status, errorMessage } : item
      )
    );
  };

  const handleUpload = async () => {
    if (uploads.length === 0 || isUploading) return;
    setIsUploading(true);
    globalThis.dispatchEvent(new CustomEvent(UPLOAD_START_EVENT));

    await uploads.reduce<Promise<void>>(
      async (chain, upload, index) => {
        await chain;
        setFileStatus(index, "uploading", null);
        try {
          await uploadFile(albumDocumentId, upload.file);
          setFileStatus(index, "done", null);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setFileStatus(index, "error", message);
        }
      },
      Promise.resolve(),
    );

    await refreshCache();
    setIsUploading(false);
    globalThis.dispatchEvent(new CustomEvent(UPLOAD_END_EVENT));
  };

  const allDone = uploads.length > 0 && uploads.every((u) => u.status === "done");

  return (
    <div class="bg-white border border-gray-200 rounded p-6 mt-8">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Upload photos</h2>
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" htmlFor="photo-files">
            Select images
          </label>
          <input
            id="photo-files"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            disabled={isUploading}
            class="block text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:text-sm file:bg-white hover:file:bg-gray-50 disabled:opacity-50"
          />
        </div>
        {uploads.length > 0 && (
          <ul class="text-sm divide-y divide-gray-100 border border-gray-100 rounded">
            {uploads.map((u, i) => (
              <li key={i} class="flex items-center justify-between px-3 py-2">
                <span class="truncate max-w-xs text-gray-700">{u.file.name}</span>
                <span class={`ml-4 shrink-0 ${
                  u.status === "done"
                    ? "text-green-600"
                    : u.status === "error"
                    ? "text-red-600"
                    : u.status === "uploading"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}>
                  {u.status === "done"
                    ? "Done"
                    : u.status === "error"
                    ? (u.errorMessage ?? "Error")
                    : u.status === "uploading"
                    ? "Uploading…"
                    : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div class="flex items-center gap-4">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploads.length === 0 || isUploading || allDone}
            class="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Upload"}
          </button>
          {allDone && (
            <span class="text-sm text-green-600">All photos uploaded. Refresh the page to see them.</span>
          )}
        </div>
      </div>
    </div>
  );
}
