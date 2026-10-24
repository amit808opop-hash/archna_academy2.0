/**
 * Centralized API client for ARCHNA ACADEMY
 * Automatically injects JWT Bearer tokens and handles credentials, headers, and 401 session expiration.
 */

export function getStoredToken(): string | null {
  return localStorage.getItem('archna_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('archna_token', token);
  } else {
    localStorage.removeItem('archna_token');
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle unauthorized response (expired or missing session)
  if (response.status === 401) {
    window.dispatchEvent(
      new CustomEvent('archna:unauthorized', {
        detail: { message: 'Your session has expired. Please sign in again.' },
      })
    );
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Unauthorized: Please sign in to access this portal.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T = any>(url: string) => apiFetch<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) =>
    apiFetch<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(url: string, body?: any) =>
    apiFetch<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
};
