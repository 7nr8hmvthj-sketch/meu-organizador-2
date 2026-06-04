const SIMPLE_AUTH_TOKEN_KEY = "meu_organizador_simple_auth_token";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredSimpleAuthToken() {
  if (!canUseBrowserStorage()) return null;

  try {
    return window.localStorage.getItem(SIMPLE_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSimpleAuthToken(token?: string | null) {
  if (!canUseBrowserStorage()) return;

  try {
    if (token) {
      window.localStorage.setItem(SIMPLE_AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SIMPLE_AUTH_TOKEN_KEY);
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export function clearStoredSimpleAuthToken() {
  setStoredSimpleAuthToken(null);
}
