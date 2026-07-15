import { getApiBase } from "./config.js";

let authGeneration = 0;

export function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  authGeneration += 1;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function refreshIfPossible() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  const generationAtStart = authGeneration;
  try {
    const res = await fetch(getApiBase() + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (
      generationAtStart !== authGeneration ||
      getTokens().refreshToken !== refreshToken
    ) return false;
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}
