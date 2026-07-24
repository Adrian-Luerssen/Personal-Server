import { getApiBase } from "./config";
import { getTokens, refreshIfPossible, clearTokens } from "./auth";
import { createApiResponseCache } from "./apiCache.mjs";
import {
  getAllEnabledPreloadPaths,
  getPreloadPathsForRoute,
} from "./apiPreload.mjs";
import { createApiMutationQueue } from "./apiMutationQueue.mjs";

// ---------------------------------------------------------------------------
// Cache configuration — tiered TTLs based on data volatility
// ---------------------------------------------------------------------------

const CACHE_TIERS = {
  // Static/slow-changing data — 5 minutes
  static: 5 * 60_000,
  // Semi-static data — 2 minutes
  moderate: 2 * 60_000,
  // Dynamic data — 30 seconds
  dynamic: 30_000,
};

// Paths matching these prefixes use longer cache TTLs
const STATIC_PATHS = [
  '/workout/exercises',
  '/workout/categories',
  '/finance/wallets',
  '/finance/categories',
  '/finance/subscriptions',
  '/spotify/linked',
  '/spotify/me',
  '/accounts/preferences',
  '/accounts',
];

const MODERATE_PATHS = [
  '/habits',           // habit definitions (not entries)
  '/streams/stats',
  '/streams/user-ranking',
  '/streams/per-hour',
  '/streams/per-day',
  '/streams/top',
  '/albums/top',
  '/artists/top',
  '/playlists/top',
  '/workout/sessions/trends',
  '/habits/trends',
  '/habits/summary',
  '/habits/progress',
];

function getCacheTTL(path) {
  if (STATIC_PATHS.some(p => path.startsWith(p))) return CACHE_TIERS.static;
  if (MODERATE_PATHS.some(p => path.startsWith(p))) return CACHE_TIERS.moderate;
  return CACHE_TIERS.dynamic;
}

// ---------------------------------------------------------------------------
// In-memory SWR cache with localStorage persistence
// ---------------------------------------------------------------------------

const LS_MAX_ENTRIES = 80;

const inflightRequests = new Map(); // deduplication: path → Promise


function decodeTokenPayload(token) {
  if (!token || !token.includes('.')) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function getCacheAccountId() {
  const { accessToken } = getTokens();
  const payload = decodeTokenPayload(accessToken);
  return (
    payload?.accountId ||
    payload?.sub ||
    payload?.id ||
    payload?.email ||
    (accessToken ? `token:${accessToken.slice(-16)}` : 'anonymous')
  );
}

const responseCache = createApiResponseCache({
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
  getAccountId: getCacheAccountId,
  maxEntries: LS_MAX_ENTRIES,
});

let mutationQueue;

function invalidateCache(path) {
  const prefix = '/' + path.split('/').filter(Boolean)[0]; // e.g. "/finance"
  const prefixes = [prefix];
  const dashboardPrefixes = ['/finance', '/habits', '/workout', '/streams', '/media', '/activity'];
  if (dashboardPrefixes.includes(prefix)) {
    prefixes.push('/dashboard');
  }
  responseCache.markPrefixesStale(prefixes);
}

function invalidateCachePrefixes(prefixes) {
  responseCache.markPrefixesStale(prefixes);
}

export function invalidateApiCachePrefixes(prefixes) {
  invalidateCachePrefixes(prefixes);
}

export function clearApiCache() {
  inflightRequests.clear();
  responseCache.clearAll();
  mutationQueue?.clearAll();
}

export function subscribeToApiPath(path, listener) {
  return responseCache.subscribe(path, listener);
}

export function getApiCacheEntry(path) {
  return responseCache.get(path);
}

export function updateApiCache(path, updater, metadata) {
  return responseCache.update(path, updater, metadata);
}

export function updateApiCachePrefixes(prefixes, updater, metadata) {
  return responseCache.updatePrefixes(prefixes, updater, metadata);
}

// ---------------------------------------------------------------------------
// Core fetch with auth retry
// ---------------------------------------------------------------------------

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
      const { accessToken: newAccess } = getTokens();
      if (newAccess) headers.set("Authorization", `Bearer ${newAccess}`);
      res = await doFetch();
    } else {
      clearTokens();
      clearApiCache();
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || res.statusText;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) message = parsed.message;
      else if (parsed?.error) message = parsed.error;
    } catch {
      // Non-JSON error body; keep the raw response text.
    }
    const err = new Error(message || `API ${res.status}: ${res.statusText}`);
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

// ---------------------------------------------------------------------------
// API object with SWR caching + request deduplication
// ---------------------------------------------------------------------------

export const api = {
  get: async (path, options = {}) => {
    const cached = responseCache.get(path);
    const force = options?.force === true;

    if (cached && !force) {
      const ttl = getCacheTTL(path);
      const lastValidatedAt = Number(cached.lastValidatedAt ?? cached.timestamp ?? 0);
      const needsRevalidation =
        cached.stale === true ||
        lastValidatedAt <= 0 ||
        Date.now() - lastValidatedAt >= ttl;

      // Return cached data immediately. Only stale entries revalidate, so
      // route changes stay instant without waking the slow backend repeatedly.
      if (needsRevalidation && !inflightRequests.has(path)) {
        const bgRefresh = apiFetch(path).then(fresh => {
          responseCache.set(path, fresh, {
            lastValidatedAt: Date.now(),
            stale: false,
          });
          inflightRequests.delete(path);
          options?.onUpdate?.(fresh);
          return fresh;
        }).catch(() => {
          inflightRequests.delete(path);
        });
        inflightRequests.set(path, bgRefresh);
      } else if (needsRevalidation && inflightRequests.has(path) && options?.onUpdate) {
        inflightRequests.get(path).then(options.onUpdate).catch(() => {});
      }
      return cached.data;
    }

    // Deduplicate: if this exact request is already in-flight, reuse it
    if (inflightRequests.has(path)) {
      return inflightRequests.get(path);
    }

    const request = apiFetch(path).then(data => {
      responseCache.set(path, data, {
        lastValidatedAt: Date.now(),
        stale: false,
      });
      inflightRequests.delete(path);
      return data;
    }).catch(err => {
      inflightRequests.delete(path);
      // If we have stale data and the request failed, return stale
      if (cached) return cached.data;
      throw err;
    });

    inflightRequests.set(path, request);
    return request;
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

// ---------------------------------------------------------------------------
// Data validity checks - compare local cache against backend sync watermarks
// ---------------------------------------------------------------------------

const ENTITY_CACHE_PREFIXES = {
  'habit-entry': ['/habits', '/dashboard'],
  habit: ['/habits', '/dashboard'],
  'workout-session': ['/workout', '/dashboard'],
  'workout-set': ['/workout', '/dashboard'],
  'finance-transaction': ['/finance', '/dashboard'],
  'finance-transaction-suggestion': ['/finance', '/dashboard'],
  'activity-daily-metric': ['/activity', '/dashboard'],
  'media-item': ['/media', '/dashboard'],
  stream: ['/streams', '/albums', '/artists', '/playlists', '/dashboard'],
};

function readStoredWatermarks() {
  return responseCache.readWatermarks();
}

mutationQueue = createApiMutationQueue({
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
  getAccountId: getCacheAccountId,
  execute: async (entry) => {
    try {
      return await apiFetch(entry.path, {
        method: entry.method,
        body: entry.body == null ? undefined : JSON.stringify(entry.body),
      });
    } catch (error) {
      // Deleting a record that disappeared while offline is already the
      // intended final state and must not poison the queue.
      if (entry.method === 'DELETE' && error?.status === 404) return null;
      throw error;
    }
  },
  onCommitted: ({ entry }) => {
    invalidateCachePrefixes(entry.prefixes?.length ? entry.prefixes : [entry.path]);
  },
  onFailed: ({ entry }) => {
    invalidateCachePrefixes(entry.prefixes?.length ? entry.prefixes : [entry.path]);
  },
});

/**
 * Applies local cache updates synchronously and persists the write for
 * background delivery. The returned `committed` promise is for reconciliation;
 * UI interactions should not await it before closing or navigating.
 */
export function queueApiMutation(path, {
  method = 'PATCH',
  body = null,
  prefixes = [],
  dedupeKey = null,
  optimisticUpdates = [],
  optimisticPrefixUpdates = [],
} = {}) {
  for (const update of optimisticUpdates) {
    if (!update?.path || typeof update.updater !== 'function') continue;
    responseCache.update(update.path, update.updater, {
      optimistic: true,
      mutationPath: path,
    });
  }
  for (const update of optimisticPrefixUpdates) {
    if (!update?.prefixes?.length || typeof update.updater !== 'function') continue;
    responseCache.updatePrefixes(update.prefixes, update.updater, {
      optimistic: true,
      mutationPath: path,
    });
  }
  return mutationQueue.enqueue({ method, path, body, prefixes, dedupeKey });
}

export function flushApiMutations(options) {
  return mutationQueue.flush(options);
}

export function retryFailedApiMutations(options) {
  return mutationQueue.retryFailed(options);
}

export function subscribeToApiMutations(listener) {
  return mutationQueue.subscribe(listener);
}

export function getApiMutationSnapshot() {
  return mutationQueue.getSnapshot();
}

function writeStoredWatermarks(watermarks) {
  responseCache.writeWatermarks(watermarks);
}

export async function checkDataValidity() {
  const previous = readStoredWatermarks();
  const response = await apiFetch('/sync/watermarks').catch(() => null);
  if (!response) return { changed: false, watermarks: previous };

  const next = response.watermarks || {};
  const changedPrefixes = new Set();

  for (const [entityType, cursor] of Object.entries(next)) {
    if (Number(previous[entityType] || 0) !== Number(cursor || 0)) {
      const prefixes = ENTITY_CACHE_PREFIXES[entityType] || [];
      prefixes.forEach(prefix => changedPrefixes.add(prefix));
    }
  }

  if (changedPrefixes.size > 0) {
    invalidateCachePrefixes([...changedPrefixes]);
  }
  writeStoredWatermarks(next);
  return { changed: changedPrefixes.size > 0, watermarks: next };
}

// ---------------------------------------------------------------------------
// Preload — call from Layout on mount to warm the cache
// ---------------------------------------------------------------------------

let idlePreloadScheduled = false;

async function warmApiPaths(paths, concurrency = 3) {
  const queue = [...new Set(paths)].filter(Boolean);
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), queue.length) },
    async () => {
      while (queue.length > 0) {
        const path = queue.shift();
        await api.get(path).catch(() => {});
      }
    }
  );
  await Promise.all(workers);
}

export function preloadRouteData(pathname, prefs) {
  const paths = getPreloadPathsForRoute(pathname, prefs);
  warmApiPaths(paths, 3).catch(() => {});
  return paths;
}

export function preloadEnabledRouteData(prefs) {
  if (idlePreloadScheduled) return;
  idlePreloadScheduled = true;
  const run = () => {
    warmApiPaths(getAllEnabledPreloadPaths(prefs), 2)
      .catch(() => {})
      .finally(() => {
        idlePreloadScheduled = false;
      });
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else if (typeof window !== 'undefined') {
    window.setTimeout(run, 250);
  } else {
    run();
  }
}

export function preloadDashboardData(prefs) {
  const preloadPaths = preloadRouteData('/home', prefs);
  checkDataValidity()
    .then(({ changed }) => {
      if (changed) {
        warmApiPaths(preloadPaths, 3).catch(() => {});
      }
    })
    .catch(() => {});
  preloadEnabledRouteData(prefs);
}
