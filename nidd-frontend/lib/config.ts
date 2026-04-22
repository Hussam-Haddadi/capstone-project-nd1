/** Browser calls go through Next rewrites to avoid CORS during local dev. */
export function apiUrl(path: string): string {
  const p = path.replace(/^\//, "");
  return `/api-proxy/${p}`;
}
