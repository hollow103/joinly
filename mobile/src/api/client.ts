import { env } from '@/config/env';
import { ApiError, isProblem } from '@/api/problem';

export type ApiResult<T> = { data: T; etag: string | null };

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  token?: string | null;
  ifMatch?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

/**
 * Thin fetch wrapper around the joinly API. Injects auth, concurrency and
 * idempotency headers, parses problem+json, and returns the response ETag so
 * callers can round-trip it in `If-Match`.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, token, ifMatch, idempotencyKey, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ifMatch) headers['If-Match'] = ifMatch;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(0, 'No se pudo contactar con el servidor.', { code: 'network_error' });
  }

  const etag = response.headers.get('ETag');
  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    if (isProblem(payload)) {
      throw new ApiError(payload.status ?? response.status, payload.title || 'Error', {
        code: payload.code,
        fields: payload.fields,
        problem: payload,
      });
    }
    throw new ApiError(response.status, `Error ${response.status}`, { code: 'http_error' });
  }

  return { data: payload as T, etag };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
