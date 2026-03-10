import { getApiBase } from "./config";
import { getTokens, refreshIfPossible, clearTokens } from "./auth";

// Stale-while-revalidate cache
const swrCache = new Map(); // key: url, value: { data, timestamp }
const SWR_MAX_AGE = 30_000; // 30s before background refresh

function invalidateCache(path) {
  const prefix = '/' + path.split('/').filter(Boolean)[0]; // e.g. "/finance"
  for (const key of swrCache.keys()) {
    if (key.startsWith(prefix)) swrCache.delete(key);
  }
}

export function clearApiCache() {
  swrCache.clear();
}

// apiFetch: attaches Authorization header and retries once on 401 after refresh
export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const { accessToken } = getTokens();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const doFetch = async () => {
    const res = await fetch(url, { ...options, headers });
    return res;
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshIfPossible();
    if (refreshed) {
      // retry with new token
      const { accessToken: newAccess } = getTokens();
      if (newAccess) headers.set("Authorization", `Bearer ${newAccess}`);
      res = await doFetch();
    } else {
      clearTokens();
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`API ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export const api = {
  get: async (path) => {
    const cached = swrCache.get(path);
    if (cached && Date.now() - cached.timestamp < SWR_MAX_AGE) {
      // Return cached data immediately, refresh in background
      apiFetch(path).then(fresh => {
        swrCache.set(path, { data: fresh, timestamp: Date.now() });
      }).catch(() => {}); // silent background refresh
      return cached.data;
    }
    const data = await apiFetch(path);
    swrCache.set(path, { data, timestamp: Date.now() });
    return data;
  },
  post: async (path, body) => {
    const data = await apiFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) });
    invalidateCache(path);
    return data;
  },
  put: async (path, body) => {
    const data = await apiFetch(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
    invalidateCache(path);
    return data;
  },
  delete: async (path) => {
    const data = await apiFetch(path, { method: "DELETE" });
    invalidateCache(path);
    return data;
  },
  patch: async (path, body) => {
    const data = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
    invalidateCache(path);
    return data;
  },
};
