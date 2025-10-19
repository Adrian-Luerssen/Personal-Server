export function getApiBase() {
  // Prefer build-time Vite var; fallback to runtime global; finally default
  const fromVite = import.meta.env?.VITE_API_BASE;
  const fromWindow = typeof window !== "undefined" && window.__API_BASE__;
  return fromVite || fromWindow || "http://localhost:4051/api";
}
