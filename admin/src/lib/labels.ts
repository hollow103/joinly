import type {
  ModerationActionValue,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '@/lib/types';

export const REASON_LABELS: Record<string, string> = {
  inappropriateContent: 'Contenido inapropiado',
  abusiveBehavior: 'Comportamiento abusivo',
  fraudulentEvent: 'Evento fraudulento',
  misleadingLocation: 'Ubicación engañosa',
  other: 'Otro',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  resolved: 'Resuelto',
  archived: 'Archivado',
};

export const STATUS_COLORS: Record<ReportStatus, 'amber' | 'emerald' | 'gray'> = {
  pending: 'amber',
  resolved: 'emerald',
  archived: 'gray',
};

export const TARGET_LABELS: Record<ReportTargetType, string> = {
  user: 'Usuario',
  event: 'Evento',
};

export const ACTION_LABELS: Record<ModerationActionValue, string> = {
  none: 'Sin acción',
  hideEvent: 'Ocultar evento',
  warnUser: 'Advertir al usuario',
  suspendUser: 'Suspender la cuenta',
};

export function reasonLabel(reason: ReportReason | string): string {
  return REASON_LABELS[reason] ?? reason;
}

export function actionLabel(action: string | null): string {
  if (!action) return '—';
  return ACTION_LABELS[action as ModerationActionValue] ?? action;
}
