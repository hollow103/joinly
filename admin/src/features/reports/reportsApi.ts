import { request, type ApiResponse } from '@/lib/api';
import type { AdminReport, ModerationDecision, ReportPage, ReportStatus } from '@/lib/types';

const PAGE_LIMIT = 20;

export async function listReports(
  status: ReportStatus,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<ReportPage> {
  const params = new URLSearchParams({ status, limit: String(PAGE_LIMIT) });
  if (cursor) params.set('cursor', cursor);
  const { data } = await request<ReportPage>(`/admin/reports?${params.toString()}`, { signal });
  return data;
}

export async function getReport(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResponse<AdminReport>> {
  return request<AdminReport>(`/admin/reports/${id}`, { signal });
}

export async function decideReport(
  id: string,
  decision: ModerationDecision,
  ifMatch: string,
): Promise<ApiResponse<AdminReport>> {
  return request<AdminReport>(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: decision,
    ifMatch,
  });
}
