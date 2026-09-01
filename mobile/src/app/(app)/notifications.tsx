import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { updatePushSettings } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import {
  DEFAULT_PUSH_SETTINGS,
  PREFERENCE_LABELS,
  loadPushSettings,
  savePushSettings,
  tryRegisterPushToken,
  type PushPreferenceKey,
  type PushSettings,
} from '@/lib/push-settings';
import { Screen, Text, tokens } from '@/ui';

const PREFERENCE_KEYS = Object.keys(PREFERENCE_LABELS) as PushPreferenceKey[];

export default function Notifications() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const [settings, setSettings] = useState<PushSettings>(DEFAULT_PUSH_SETTINGS);
  const [ready, setReady] = useState(false);
  const [pushTokenMissing, setPushTokenMissing] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPushSettings().then((loaded) => {
      if (active) {
        setSettings(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function persist(next: PushSettings) {
    setSettings(next);
    await savePushSettings(next);
    let expoPushToken: string | undefined;
    if (next.enabled) {
      const registered = await tryRegisterPushToken();
      expoPushToken = registered ?? undefined;
      setPushTokenMissing(!registered);
    } else {
      setPushTokenMissing(false);
    }
    try {
      // Backend handler does not exist yet; a 404/405 is expected and ignored.
      await updatePushSettings(token, {
        enabled: next.enabled,
        preferences: next.preferences,
        ...(expoPushToken ? { expoPushToken } : {}),
      });
    } catch {
      // preferences stay stored locally
    }
  }

  function toggleEnabled(value: boolean) {
    void persist({ ...settings, enabled: value });
  }

  function togglePreference(key: PushPreferenceKey, value: boolean) {
    void persist({ ...settings, preferences: { ...settings.preferences, [key]: value } });
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text variant="title">Notificaciones</Text>
        <Text variant="muted">
          Elige qué avisos quieres recibir. La entrega de notificaciones se activará más adelante.
        </Text>

        <View style={styles.card}>
          <View style={styles.rowMain}>
            <Text style={styles.rowLabel}>Recibir notificaciones</Text>
            <Switch
              value={settings.enabled}
              onValueChange={toggleEnabled}
              disabled={!ready}
              accessibilityLabel="Recibir notificaciones"
            />
          </View>
          {pushTokenMissing ? (
            <Text style={styles.note}>
              Este dispositivo aún no puede registrar el envío de notificaciones (llegará con la app
              instalada). Tus preferencias quedan guardadas.
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, !settings.enabled ? styles.cardDisabled : null]}>
          {PREFERENCE_KEYS.map((key) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{PREFERENCE_LABELS[key]}</Text>
              <Switch
                value={settings.preferences[key]}
                onValueChange={(value) => togglePreference(key, value)}
                disabled={!ready || !settings.enabled}
                accessibilityLabel={PREFERENCE_LABELS[key]}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.lg,
  },
  cardDisabled: { opacity: 0.5 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: { color: tokens.color.text, flex: 1, fontSize: 14, lineHeight: 19 },
  note: { color: tokens.color.textMuted, fontSize: 12, lineHeight: 17 },
});
