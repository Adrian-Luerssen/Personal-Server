import { getApiBase } from "./config";
import { getTokens, refreshIfPossible, clearTokens } from "./auth";

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
  get: (path) => apiFetch(path),
  post: (path, body) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
