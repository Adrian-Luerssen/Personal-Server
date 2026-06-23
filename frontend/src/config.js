import { isNativeMobileApp } from "./mobilePlatform";

const LOCAL_DEV_API_BASE = "http://localhost:4051";

export function normalizeApiBase(value) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function getApiBase() {
  // Prefer build-time Vite var; fallback to runtime global; finally local dev.
  const configuredBase = import.meta.env?.VITE_API_BASE
    || (typeof window !== "undefined" && window.__API_BASE__);

  if (!configuredBase && isNativeMobileApp()) {
    throw new Error(
      "Android app is missing VITE_API_BASE. Configure the repository secret and rebuild the APK."
    );
  }

  return normalizeApiBase(configuredBase || LOCAL_DEV_API_BASE);
}
