export type ReportStatus = 'pending' | 'archived' | 'resolved';
export type ReportTargetType = 'user' | 'event';
export type ReportReason =
  'inappropriateContent' | 'abusiveBehavior' | 'fraudulentEvent' | 'misleadingLocation' | 'other';
export type ModerationActionValue = 'none' | 'hideEvent' | 'warnUser' | 'suspendUser';
export type DecisionStatus = 'archived' | 'resolved';

/** Mirrors backend AdminReport (openapi.yaml #/components/schemas/AdminReport). */
export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason | string;
  description: string | null;
  status: ReportStatus;
  action: ModerationActionValue | string | null;
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPage {
  items: AdminReport[];
  page: { nextCursor: string | null };
}

export interface ModerationDecision {
  status: DecisionStatus;
  action: ModerationActionValue;
  note?: string;
}

/** Subset of backend Profile used to gate the panel on the admin role. */
export interface Profile {
  id: string;
  alias: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'deletion_requested';
}
