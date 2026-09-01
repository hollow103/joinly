import { isValid, parse } from 'date-fns';
import { categoryOptions } from '@/events/discovery';

export { categoryOptions };

export type AccessMode = 'direct' | 'approval' | 'privateInvitation';

// Label + one-line effect, shown next to each option per docs/19 (Tarjeta 2).
export const accessModeOptions: readonly [AccessMode, string, string][] = [
  ['direct', 'Directo', 'Cualquiera se une al instante hasta llenar el aforo.'],
  ['approval', 'Con aprobación', 'Revisas cada solicitud antes de confirmar la plaza.'],
  ['privateInvitation', 'Privado', 'Solo entra quien tenga un código de invitación.'],
];

export const durationOptions: readonly [number, string][] = [
  [30, '30 min'],
  [60, '1 h'],
  [90, '1 h 30'],
  [120, '2 h'],
  [180, '3 h'],
  [240, '4 h'],
];

export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';

/**
 * Parses the two text fields ("31/12/2026" + "19:30") into a local Date, or
 * null when either is malformed. The caller still checks it is in the future.
 */
export function parseLocalDateTime(dateText: string, timeText: string): Date | null {
  const trimmedDate = dateText.trim();
  const trimmedTime = timeText.trim();
  if (!trimmedDate || !trimmedTime) return null;
  const parsed = parse(
    `${trimmedDate} ${trimmedTime}`,
    `${DATE_FORMAT} ${TIME_FORMAT}`,
    new Date(),
  );
  return isValid(parsed) ? parsed : null;
}

export type EventFormErrors = Partial<
  Record<'title' | 'description' | 'category' | 'startsAt' | 'location', string>
>;

export type EventFormValues = {
  title: string;
  description: string;
  notes: string;
  category: string;
  dateText: string;
  timeText: string;
  durationMinutes: number;
  accessMode: AccessMode;
  unlimitedCapacity: boolean;
  capacity: string;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
};

export function validateEventForm(values: EventFormValues, now: Date): EventFormErrors {
  const errors: EventFormErrors = {};
  const title = values.title.trim();
  if (title.length < 3 || title.length > 120) errors.title = 'Entre 3 y 120 caracteres.';
  if (values.description.trim().length === 0) errors.description = 'Añade una descripción.';
  if (!categoryOptions.some(([value]) => value === values.category))
    errors.category = 'Elige una categoría.';
  const startsAt = parseLocalDateTime(values.dateText, values.timeText);
  if (!startsAt) errors.startsAt = 'Usa el formato DD/MM/AAAA y HH:MM.';
  else if (startsAt.getTime() <= now.getTime()) errors.startsAt = 'La fecha debe ser futura.';
  if (values.latitude === null || values.longitude === null)
    errors.location = 'Marca la ubicación del plan para poder publicarlo.';
  return errors;
}
