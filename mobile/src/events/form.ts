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

export type EventFormErrors = Partial<
  Record<'title' | 'description' | 'category' | 'startsAt' | 'location', string>
>;

export type EventFormValues = {
  title: string;
  description: string;
  notes: string;
  category: string;
  startsAt: Date | null;
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
  if (!values.startsAt) errors.startsAt = 'Elige la fecha y la hora del plan.';
  else if (values.startsAt.getTime() <= now.getTime())
    errors.startsAt = 'La fecha debe ser futura.';
  if (values.latitude === null || values.longitude === null)
    errors.location = 'Marca la ubicación del plan para poder publicarlo.';
  return errors;
}
