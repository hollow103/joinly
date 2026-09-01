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

// ---- M4: participation, approvals and invitations -------------------------

export type Participation = components['schemas']['Participation'];
export type Invitation = components['schemas']['Invitation'];

export type Participant = {
  participationId: string;
  user: PublicProfile;
  status: 'pending' | 'confirmed' | 'rejected' | 'abandoned';
  requestedAt: string;
};

export type ParticipantPage = {
  items: Participant[];
  page: { nextCursor: string | null };
};

export function joinEvent(
  token: string | null,
  eventId: string,
  idempotencyKey: string,
  invitationCode?: string,
): Promise<ApiResult<Participation>> {
  return apiFetch<Participation>(`/events/${eventId}/participations`, {
    method: 'POST',
    body: invitationCode ? { invitationCode } : {},
    token,
    idempotencyKey,
  });
}

export function abandonParticipation(
  token: string | null,
  eventId: string,
): Promise<ApiResult<null>> {
  return apiFetch<null>(`/events/${eventId}/participation`, { method: 'DELETE', token });
}

export function getParticipants(
  token: string | null,
  eventId: string,
  params: { status: 'confirmed' | 'pending'; cursor?: string | null; limit?: number },
): Promise<ApiResult<ParticipantPage>> {
  const query = new URLSearchParams({ status: params.status });
  if (params.cursor) query.set('cursor', params.cursor);
  query.set('limit', String(params.limit ?? 20));
  return apiFetch<ParticipantPage>(`/events/${eventId}/participations?${query.toString()}`, {
    token,
  });
}

export function resolveParticipation(
  token: string | null,
  eventId: string,
  participationId: string,
  status: 'confirmed' | 'rejected',
  ifMatch: string,
): Promise<ApiResult<Participation>> {
  return apiFetch<Participation>(`/events/${eventId}/participations/${participationId}`, {
    method: 'PATCH',
    body: { status },
    token,
    ifMatch,
  });
}

export function createInvitation(
  token: string | null,
  eventId: string,
  input: { maxUses?: number; expiresAt?: string } = {},
): Promise<ApiResult<Invitation>> {
  return apiFetch<Invitation>(`/events/${eventId}/invitations`, {
    method: 'POST',
    body: input,
    token,
  });
}

export function revokeInvitation(
  token: string | null,
  eventId: string,
  invitationId: string,
): Promise<ApiResult<null>> {
  return apiFetch<null>(`/events/${eventId}/invitations/${invitationId}`, {
    method: 'DELETE',
    token,
  });
}

// ---- M5: blocks and settings -------------------------------------------------

export type BlockedUser = { user: PublicProfile; createdAt: string };
export type BlocksPage = { items: BlockedUser[]; page: { nextCursor: string | null } };

export function getBlocks(
  token: string | null,
  params: { cursor?: string | null; limit?: number } = {},
): Promise<ApiResult<BlocksPage>> {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  query.set('limit', String(params.limit ?? 50));
  return apiFetch<BlocksPage>(`/blocks?${query.toString()}`, { token });
}

export function createBlock(token: string | null, blockedUserId: string): Promise<ApiResult<null>> {
  return apiFetch<null>('/blocks', { method: 'POST', body: { blockedUserId }, token });
}

export function deleteBlock(token: string | null, blockedUserId: string): Promise<ApiResult<null>> {
  return apiFetch<null>(`/blocks/${blockedUserId}`, { method: 'DELETE', token });
}

export type PushSettingsInput = {
  enabled: boolean;
  expoPushToken?: string;
  preferences?: Record<string, boolean>;
};

/**
 * Best-effort: `PUT /me/push-settings` is in the contract but has no backend
 * handler yet, so callers keep the source of truth locally and treat a 404/405
 * as "not persisted server-side" rather than an error.
 */
export function updatePushSettings(
  token: string | null,
  input: PushSettingsInput,
): Promise<ApiResult<null>> {
  return apiFetch<null>('/me/push-settings', { method: 'PUT', body: input, token });
}
