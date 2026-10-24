/**
 * Centralized API client for ARCHNA ACADEMY
 * Automatically injects JWT Bearer tokens and handles credentials, headers, and 401 session expiration.
 */

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL as string)) ||
  ''
).replace(/\/$/, '');

export function resolveApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

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

  const targetUrl = resolveApiUrl(endpoint);
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (netErr: any) {
    throw new Error('Unable to connect. Please try again.');
  }

  // Handle unauthorized response (expired or missing session)
  if (response.status === 401) {
    window.dispatchEvent(
      new CustomEvent('archna:unauthorized', {
        detail: { message: 'Your session has expired. Please sign in again.' },
      })
    );
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Login failed. Please check your credentials.');
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (jsonErr) {
    if (!response.ok) {
      throw new Error('Unable to connect. Please try again.');
    }
  }

  if (!response.ok) {
    throw new Error(data.error || 'Unable to connect. Please try again.');
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
