const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

const isLocalDevelopment =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

// In production, an empty base uses same-origin /api routes. If the API is
// hosted separately, set VITE_API_BASE_URL to that backend's public origin.
export const API_BASE_URL = (
  configuredApiBase ||
  (isLocalDevelopment ? 'http://localhost:3001' : '')
).replace(/\/+$/, '');

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
