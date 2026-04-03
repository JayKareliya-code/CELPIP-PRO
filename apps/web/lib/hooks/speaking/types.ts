/**
 * Internal API response shapes for the speaking upload pipeline.
 * Not exported from the package boundary — consumers use lib/types.ts.
 */

export interface StartAttemptResponse {
  attempt_id: string;
  status:     string;
}

export interface UploadUrlResponse {
  upload_url:         string;
  s3_key:             string;
  expires_in_seconds: number;
}
