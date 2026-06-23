import { getApiBase } from "./config";
import { getTokens, refreshIfPossible, clearTokens } from "./auth";

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

const LS_CACHE_KEY = 'ps-api-cache';
const LS_SYNC_WATERMARKS_KEY = 'ps-sync-watermarks';
const LS_MAX_ENTRIES = 60;

const swrCache = new Map();
const inflightRequests = new Map(); // deduplication: path → Promise

// Restore cache from localStorage on startup
try {
  const stored = localStorage.getItem(LS_CACHE_KEY);
  if (stored) {
    const entries = JSON.parse(stored);
    for (const [key, val] of entries) {
      swrCache.set(key, val);
    }
  }
} catch {
  // corrupted cache, ignore
}

function persistCache() {
  try {
    const entries = [...swrCache.entries()].slice(-LS_MAX_ENTRIES);
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable
  }
}

// Debounce persistence so we don't thrash localStorage
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistCache();
  }, 2000);
}

function invalidateCache(path) {
  const prefix = '/' + path.split('/').filter(Boolean)[0]; // e.g. "/finance"
  for (const key of swrCache.keys()) {
    if (key.startsWith(prefix)) swrCache.delete(key);
  }
  schedulePersist();
}

function invalidateCachePrefixes(prefixes) {
  for (const key of swrCache.keys()) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      swrCache.delete(key);
    }
  }
  schedulePersist();
}

export function clearApiCache() {
  swrCache.clear();
  inflightRequests.clear();
  localStorage.removeItem(LS_CACHE_KEY);
  localStorage.removeItem(LS_SYNC_WATERMARKS_KEY);
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

// ---------------------------------------------------------------------------
// API object with SWR caching + request deduplication
// ---------------------------------------------------------------------------

export const api = {
  get: async (path) => {
    const cached = swrCache.get(path);

    if (cached) {
      // Return cached data immediately, even when stale. Mobile navigation
      // should not wait for API latency; freshness is handled in background.
      if (!inflightRequests.has(path)) {
        const bgRefresh = apiFetch(path).then(fresh => {
          swrCache.set(path, { data: fresh, timestamp: Date.now() });
          schedulePersist();
          inflightRequests.delete(path);
          return fresh;
        }).catch(() => {
          inflightRequests.delete(path);
        });
        inflightRequests.set(path, bgRefresh);
      }
      return cached.data;
    }

    // Deduplicate: if this exact request is already in-flight, reuse it
    if (inflightRequests.has(path)) {
      return inflightRequests.get(path);
    }

    const request = apiFetch(path).then(data => {
      swrCache.set(path, { data, timestamp: Date.now() });
      schedulePersist();
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
  'media-item': ['/media', '/dashboard'],
  stream: ['/streams', '/albums', '/artists', '/playlists', '/dashboard'],
};

function readStoredWatermarks() {
  try {
    return JSON.parse(localStorage.getItem(LS_SYNC_WATERMARKS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStoredWatermarks(watermarks) {
  try {
    localStorage.setItem(LS_SYNC_WATERMARKS_KEY, JSON.stringify(watermarks));
  } catch {
    // storage unavailable or full
  }
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

const PRELOAD_PATHS = [
  '/dashboard/intelligence',
  '/streams/stats?timeframe=all',
  '/workout/sessions?page=1&limit=1',
  '/habits/summary',
  '/finance/transactions/summary',
  '/workout/sessions/recent',
  '/finance/wallets',
  '/finance/categories',
  '/workout/exercises',
];

export function preloadDashboardData() {
  checkDataValidity()
    .then(({ changed }) => {
      if (changed) {
        for (const path of PRELOAD_PATHS) {
          api.get(path).catch(() => {});
        }
      }
    })
    .catch(() => {});

  for (const path of PRELOAD_PATHS) {
    // Only preload if not already cached
    const cached = swrCache.get(path);
    const ttl = getCacheTTL(path);
    if (!cached || Date.now() - cached.timestamp >= ttl) {
      api.get(path).catch(() => {}); // silent, best-effort
    }
  }
}
