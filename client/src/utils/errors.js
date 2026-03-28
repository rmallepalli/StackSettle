/**
 * Extract a human-readable message from an axios error.
 * Falls back to a generic message so the UI never shows a raw object.
 */
export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback
}
