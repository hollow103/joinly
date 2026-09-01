import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export type PushPreferenceKey = 'requests' | 'decisions' | 'changes' | 'cancellations';

export type PushSettings = {
  enabled: boolean;
  preferences: Record<PushPreferenceKey, boolean>;
};

export const PREFERENCE_LABELS: Record<PushPreferenceKey, string> = {
  requests: 'Solicitudes para unirse a mis planes',
  decisions: 'Decisiones sobre mis solicitudes',
  changes: 'Cambios en planes en los que participo',
  cancellations: 'Cancelaciones de planes',
};

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  enabled: false,
  preferences: { requests: true, decisions: true, changes: true, cancellations: true },
};

const STORAGE_KEY = 'joinly.push.settings';

export async function loadPushSettings(): Promise<PushSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PUSH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PushSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      preferences: { ...DEFAULT_PUSH_SETTINGS.preferences, ...parsed.preferences },
    };
  } catch {
    return DEFAULT_PUSH_SETTINGS;
  }
}

export async function savePushSettings(settings: PushSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore: the screen keeps the in-memory value
  }
}

/**
 * Best-effort Expo push token. Expo Go on Android no longer supports remote push
 * (SDK 53+) and there is no EAS project, so this returns null instead of
 * throwing; a real token arrives once the app ships as a dev/standalone build.
 */
export async function tryRegisterPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
