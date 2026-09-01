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
