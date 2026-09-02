import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EventDiscovery } from '@/api/endpoints';

export const categoryOptions = [
  ['sportWellbeing', 'Bienestar'],
  ['cultureLeisure', 'Cultura y ocio'],
  ['learning', 'Aprendizaje'],
  ['communityVolunteering', 'Comunidad'],
  ['pets', 'Mascotas'],
  ['networking', 'Conexiones'],
] as const;

export type TimeFilter = 'any' | 'afternoon' | 'tomorrow' | 'weekend';

/**
 * Turns a time chip into a `{ startsAfter, startsBefore }` ISO window that the
 * backend applies in SQL, so the filter composes with cursor pagination
 * (`POST /events/search`). All bounds are computed in the device's local time.
 */
export function timeFilterWindow(
  filter: TimeFilter,
  now: Date = new Date(),
): { startsAfter?: string; startsBefore?: string } {
  if (filter === 'any') return {};

  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const endOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  };

  if (filter === 'afternoon') {
    const from = new Date(now);
    from.setHours(12, 0, 0, 0);
    return { startsAfter: from.toISOString(), startsBefore: endOfDay(now).toISOString() };
  }

  if (filter === 'tomorrow') {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return { startsAfter: startOfDay(t).toISOString(), startsBefore: endOfDay(t).toISOString() };
  }

  // weekend: from the upcoming (or current) Saturday to the end of Sunday.
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const sat = new Date(now);
  if (day === 0) sat.setDate(now.getDate() - 1);
  else sat.setDate(now.getDate() + ((6 - day + 7) % 7));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { startsAfter: startOfDay(sat).toISOString(), startsBefore: endOfDay(sun).toISOString() };
}

export function eventDate(startsAt: string) {
  return format(new Date(startsAt), "EEE d 'de' MMM, HH:mm", { locale: es });
}

export function categoryLabel(category: string) {
  return categoryOptions.find(([value]) => value === category)?.[1] ?? category;
}

export function availabilityLabel(event: EventDiscovery) {
  if (event.availability === 'full') return 'Completo';
  if (event.accessMode === 'approval') return 'Con aprobación';
  if (event.accessMode === 'privateInvitation') return 'Solo invitación';
  if (event.capacity === null || event.capacity === undefined) return 'Plazas abiertas';
  return `${event.capacity - event.confirmedCount} plazas`;
}

export function distanceLabel(distanceMeters?: number) {
  if (distanceMeters === undefined) return '';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(Math.round(distanceMeters / 100) / 10).toLocaleString('es-ES')} km`;
}
