const resolveEnvString = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const rawApiBase = resolveEnvString(import.meta.env.VITE_API_BASE_URL, "/api");
const rawSocketUrl = resolveEnvString(import.meta.env.VITE_SOCKET_URL, "");

export const API_BASE_URL = rawApiBase;
export const SOCKET_URL = rawSocketUrl.length > 0 ? rawSocketUrl : undefined;

export const buildApiUrl = (path: string) => {
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};
