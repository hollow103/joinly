import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, detail?: string, fields?: Record<string, string>) {
    super(detail ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fields = fields;
  }
}

export interface ApiResponse<T> {
  data: T;
  etag: string | null;
}

interface RequestOptions {
  method?: 'GET' | 'PATCH' | 'POST' | 'DELETE';
  body?: unknown;
  ifMatch?: string;
  signal?: AbortSignal;
}

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError(401, 'no_session', 'La sesión ha caducado. Vuelve a iniciar sesión.');
  }
  return token;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${await bearer()}`,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.ifMatch) headers['If-Match'] = options.ifMatch;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const etag = response.headers.get('ETag');

  if (response.status === 204) {
    return { data: undefined as T, etag };
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const problem = payload as {
      code?: string;
      detail?: string;
      title?: string;
      fields?: Record<string, string>;
    } | null;
    throw new ApiError(
      response.status,
      problem?.code ?? 'unknown',
      problem?.detail ?? problem?.title,
      problem?.fields,
    );
  }

  return { data: payload as T, etag };
}
