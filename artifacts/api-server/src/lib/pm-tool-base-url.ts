/**
 * Public base URL of the PM SPA for email / notification links (no trailing slash).
 * Matches Spring: PM_TOOL_BASE_URL, then PUBLIC_APP_URL, then FRONTEND_URL, else local dev default.
 */
export function resolvePmToolBaseUrl(): string {
  const raw =
    process.env.PM_TOOL_BASE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim();
  if (!raw) {
    return "http://localhost:5173";
  }
  return raw.replace(/\/+$/, "");
}
