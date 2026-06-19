const ACCESS_KEY = "unimind.access";
const REFRESH_KEY = "unimind.refresh";

let memoryAccessToken: string | null = null;

export function getAccessToken() {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window === "undefined") return null;
  memoryAccessToken = window.localStorage.getItem(ACCESS_KEY);
  return memoryAccessToken;
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  memoryAccessToken = accessToken;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
