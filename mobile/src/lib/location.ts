import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export type LocationFailureCode = 'permission_denied' | 'unavailable' | 'timeout';

export class LocationError extends Error {
  readonly code: LocationFailureCode;
  constructor(code: LocationFailureCode, message: string) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
  }
}

const CURRENT_POSITION_TIMEOUT_MS = 15_000;
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new LocationError('timeout', 'location request timed out')), ms),
    ),
  ]);
}

/**
 * Contextual current-location read shared by discovery and event creation.
 * Requests the foreground permission, then prefers a recent cached fix and
 * falls back to a fresh reading behind an explicit timeout: Android's
 * `getCurrentPositionAsync` has no timeout of its own and hangs indefinitely on
 * an emulator with no location set. The device location is used only for the
 * active request and is never persisted (see docs/18).
 */
export async function readCurrentLocation(): Promise<Coords> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new LocationError('permission_denied', 'foreground location permission denied');
  }

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  if (lastKnown) {
    return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      CURRENT_POSITION_TIMEOUT_MS,
    );
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (error) {
    if (error instanceof LocationError) throw error;
    throw new LocationError('unavailable', 'current position unavailable');
  }
}

export function locationErrorMessage(error: unknown): string {
  if (error instanceof LocationError) {
    if (error.code === 'permission_denied') {
      return 'Necesitamos tu permiso de ubicación para esta búsqueda. No guardamos tu ubicación.';
    }
    if (error.code === 'timeout') {
      return 'La ubicación tarda demasiado. Comprueba que el GPS del dispositivo esté activo y vuelve a intentarlo.';
    }
  }
  return 'No pudimos obtener tu ubicación. Comprueba que la ubicación del dispositivo esté activa.';
}
