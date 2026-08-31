import { apiFetch, type ApiResult } from '@/api/client';
import type { components } from '@/api/schema';

export type Profile = components['schemas']['Profile'];
export type PublicProfile = components['schemas']['PublicProfile'];

/**
 * Requires a bearer token. Called with `null` during M0 to exercise the auth
 * chain, which is expected to answer 401.
 */
export function getMe(token: string | null): Promise<ApiResult<Profile>> {
  return apiFetch<Profile>('/me', { token });
}
