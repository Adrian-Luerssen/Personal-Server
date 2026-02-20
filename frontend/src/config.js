export function getApiBase() {
  // Prefer build-time Vite var; fallback to runtime global; finally default
  const base = import.meta.env?.VITE_API_BASE
    || (typeof window !== "undefined" && window.__API_BASE__)
    || "http://localhost:4051";
  // Strip trailing slash and append /api
  return base.replace(/\/+$/, "") + "/api";
}
