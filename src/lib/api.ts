const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
const TOKEN_STORAGE_KEY = 'gems-flow-auth-token';

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | FormData | object | null;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const finalHeaders = new Headers(headers);
  const token = auth ? getAuthToken() : null;

  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let finalBody = body as BodyInit | null | undefined;

  if (body && !(body instanceof FormData) && typeof body === 'object') {
    finalHeaders.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(getApiUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Erreur réseau');
  }

  return payload as T;
}
