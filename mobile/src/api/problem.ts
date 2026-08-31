// RFC 9457 (problem+json) helpers shared by the API layer.

export type Problem = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  fields?: Record<string, string>;
};

type ApiErrorOptions = {
  code?: string;
  fields?: Record<string, string>;
  problem?: Problem;
};

/**
 * Every non-2xx response and every transport failure surfaces as an ApiError.
 * `status === 0` means the request never reached the backend.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly problem?: Problem;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code ?? 'unknown';
    this.fields = options.fields;
    this.problem = options.problem;
  }
}

export function isProblem(body: unknown): body is Problem {
  return (
    typeof body === 'object' &&
    body !== null &&
    'title' in body &&
    'status' in body &&
    'code' in body
  );
}
