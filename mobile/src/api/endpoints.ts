import { apiFetch, type ApiResult } from '@/api/client';
import type { components } from '@/api/schema';

export type Profile = components['schemas']['Profile'];
export type PublicProfile = components['schemas']['PublicProfile'];
export type EventDiscovery = components['schemas']['EventDiscovery'];
export type EventDetail = components['schemas']['EventDetail'];

export type EventSearchPage = {
  items: EventDiscovery[];
  page: { nextCursor: string | null };
  suggestedRadiusMeters?: number;
};

/**
 * Requires a bearer token. Called with `null` during M0 to exercise the auth
 * chain, which is expected to answer 401.
 */
export function getMe(token: string | null): Promise<ApiResult<Profile>> {
  return apiFetch<Profile>('/me', { token });
}

export function updateMe(
  token: string | null,
  input: components['schemas']['ProfileInput'],
  ifMatch?: string,
): Promise<ApiResult<Profile>> {
  return apiFetch<Profile>('/me', { method: 'PUT', body: input, token, ifMatch });
}

export function deleteMe(token: string | null): Promise<ApiResult<null>> {
  return apiFetch<null>('/me', { method: 'DELETE', token });
}

export function searchEvents(
  token: string | null,
  input: components['schemas']['EventSearch'],
): Promise<ApiResult<EventSearchPage>> {
  return apiFetch<EventSearchPage>('/events/search', { method: 'POST', body: input, token });
}

export function getEvent(token: string | null, id: string): Promise<ApiResult<EventDetail>> {
  return apiFetch<EventDetail>(`/events/${id}`, { token });
}

export type EventInput = components['schemas']['EventInput'];
export type EventPatch = components['schemas']['EventPatch'];

export type MyEventsPage = {
  items: EventDetail[];
  page: { nextCursor: string | null };
};

/** Own-events list. `status` is one of published | cancelled | closed, or omitted for all. */
export function getMyEvents(
  token: string | null,
  params: { status?: string; cursor?: string | null; limit?: number } = {},
): Promise<ApiResult<MyEventsPage>> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.cursor) query.set('cursor', params.cursor);
  query.set('limit', String(params.limit ?? 20));
  return apiFetch<MyEventsPage>(`/me/events?${query.toString()}`, { token });
}

export function createEvent(
  token: string | null,
  input: EventInput,
): Promise<ApiResult<EventDetail>> {
  return apiFetch<EventDetail>('/events', { method: 'POST', body: input, token });
}

export function patchEvent(
  token: string | null,
  id: string,
  input: EventPatch,
  ifMatch: string,
): Promise<ApiResult<EventDetail>> {
  return apiFetch<EventDetail>(`/events/${id}`, { method: 'PATCH', body: input, token, ifMatch });
}

export function cancelEvent(
  token: string | null,
  id: string,
  reason?: string,
): Promise<ApiResult<null>> {
  return apiFetch<null>(`/events/${id}/cancellation`, {
    method: 'POST',
    body: reason ? { reason } : {},
    token,
  });
}
