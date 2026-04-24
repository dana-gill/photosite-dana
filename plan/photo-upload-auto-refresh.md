# Plan: Auto-refresh after photo upload in album editor

## Context
The album editor (`/admin/albums/[documentId]`) has a `PhotoUploader` island that already supports selecting multiple files and uploading them sequentially. After all uploads finish, it currently shows a static message: "Refresh the page to see them." The goal is to automatically reload the page after uploads complete, removing the need for manual refresh.

## Files to modify
- `islands/PhotoUploader.tsx`

## Change
In `handleUpload`, after `refreshCache()` completes, call `globalThis.location.reload()` if at least one upload succeeded. If all uploads errored, do not reload — keep the error states visible.

### Implementation detail
Since `setUploads` is async (Preact state), track final statuses in a local array during the reduce loop. Use that array after the loop to decide whether to reload.

### Updated `handleUpload` logic (pseudocode)
```
const finalStatuses: UploadStatus[] = []

await uploads.reduce(async (chain, upload, index) => {
  await chain
  setFileStatus(index, "uploading", null)
  try {
    await uploadFile(albumDocumentId, upload.file)
    setFileStatus(index, "done", null)
    finalStatuses.push("done")
  } catch (err) {
    setFileStatus(index, "error", message)
    finalStatuses.push("error")
  }
}, Promise.resolve())

await refreshCache()
setIsUploading(false)
dispatchEvent(UPLOAD_END_EVENT)

if (finalStatuses.some(s => s === "done")) {
  globalThis.location.reload()
}
```

## Remove
- The `allDone` variable and the "All photos uploaded. Refresh the page to see them." span — no longer needed after auto-reload.

## Verification
1. Open an album editor page
2. Select multiple images via the file input
3. Click Upload
4. Verify each file shows "Uploading…" then "Done" in sequence
5. Verify the page automatically reloads, showing the new photos in the sorter
6. If all uploads fail, verify the page does NOT reload and error states remain visible
