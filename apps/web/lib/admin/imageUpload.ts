// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/imageUpload.ts
//
// Shared helpers for admin S3 image upload flows.
// Imported by SpeakingFormFields and OptionEditor to avoid duplicating
// stripPresign(), API_BASE, and the XHR upload Promise wrapper.
// ─────────────────────────────────────────────────────────────────────────────

/** Base URL for all API calls. Falls back to localhost in dev. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Max upload size in bytes (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Accepted MIME types for scene + option-card images. */
export const IMAGE_ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/gif";

/**
 * Strip presign query parameters from an S3 URL, returning the clean path URL.
 *
 * Three formats handled:
 *   - Raw key:        "speaking-task-3/uuid.jpg"         → unchanged
 *   - Clean path URL: "https://host/bucket/key"          → unchanged
 *   - Presigned URL:  "https://host/bucket/key?X-Amz-…"  → query stripped
 */
export function stripPresign(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url; // raw S3 key — return as-is
  }
}

/**
 * Upload a File to S3 via XHR for progress tracking.
 *
 * Returns a Promise that resolves when the PUT completes (2xx) or rejects on error.
 * The caller should pass an `AbortSignal` (from an `AbortController`) so the XHR
 * can be cancelled when the component unmounts mid-upload.
 *
 * @param uploadUrl  Presigned PUT URL returned by the backend
 * @param file       File object from the file picker
 * @param mimeType   MIME type to set on the PUT request
 * @param onProgress Callback invoked with 0-100 integer progress
 * @param signal     AbortSignal — XHR is aborted when signal fires
 */
export function uploadFileToS3(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    // Hook into AbortSignal so the parent can cancel the XHR on unmount
    if (signal.aborted) {
      xhr.abort();
      return;
    }
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(file);
  });
}
