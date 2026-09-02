import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  cancelEvent,
  getEvent,
  patchEvent,
  type EventDetail,
  type EventPatch,
} from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { accessModeOptions, durationOptions, type AccessMode } from '@/events/form';
import { Button, DateTimeField, Screen, Text, tokens } from '@/ui';

type Draft = {
  title: string;
  description: string;
  notes: string;
  startsAt: Date;
  durationMinutes: number;
  accessMode: AccessMode;
  unlimitedCapacity: boolean;
  capacity: string;
};

function draftFromEvent(event: EventDetail): Draft {
  return {
    title: event.title,
    description: event.description,
    notes: event.notes ?? '',
    startsAt: new Date(event.startsAt),
    durationMinutes: event.durationMinutes,
    accessMode: event.accessMode as AccessMode,
    unlimitedCapacity: event.capacity == null,
    capacity: event.capacity == null ? '' : String(event.capacity),
  };
}

export default function EditEvent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((state) => state.token);

  const eventQuery = useQuery({
    queryKey: ['events', id],
    queryFn: () => getEvent(token, id),
    enabled: Boolean(id && token),
  });
  const event = eventQuery.data?.data;
  const etag = eventQuery.data?.etag ?? '';

  // Sparse overrides on top of the loaded event; no effect needed to seed state,
  // and a stale reload just re-derives the baseline under any pending edits.
  const [edits, setEdits] = useState<Partial<Draft>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const draft = event ? { ...draftFromEvent(event), ...edits } : null;
  const started = event ? new Date(event.startsAt).getTime() <= new Date().getTime() : false;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEdits((current) => ({ ...current, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!event || !draft) return Promise.reject(new Error('not loaded'));
      const patch: EventPatch = {};
      if (draft.title.trim() !== event.title) patch.title = draft.title.trim();
      if (draft.description.trim() !== event.description)
        patch.description = draft.description.trim();
      if (draft.notes.trim() !== (event.notes ?? '')) patch.notes = draft.notes.trim();
      if (draft.startsAt.toISOString() !== new Date(event.startsAt).toISOString())
        patch.startsAt = draft.startsAt.toISOString();
      if (draft.durationMinutes !== event.durationMinutes)
        patch.durationMinutes = draft.durationMinutes;
      if (draft.accessMode !== event.accessMode) patch.accessMode = draft.accessMode;
      const newCapacity = draft.unlimitedCapacity ? null : Number(draft.capacity);
      if (newCapacity !== (event.capacity ?? null)) patch.capacity = newCapacity;
      return patchEvent(token, id, patch, etag);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
      await queryClient.invalidateQueries({ queryKey: ['events', id] });
      router.replace('/plans');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'concurrent_update') {
          setEdits({});
          setStaleWarning(true);
          setFormError(null);
          void eventQuery.refetch();
          return;
        }
        if (error.code === 'event_not_editable') {
          setFormError('Este plan ya no se puede editar.');
          return;
        }
        if (error.fields) {
          setFormError('Revisa los datos: ' + Object.values(error.fields).join(' '));
          return;
        }
      }
      setFormError('No se pudieron guardar los cambios.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelEvent(token, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
      router.replace('/plans');
    },
    onError: () => setFormError('No se pudo cancelar el plan.'),
  });

  function confirmCancel() {
    Alert.alert('Cancelar plan', 'Se avisará a las personas confirmadas. No se puede deshacer.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar plan', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  }

  if (eventQuery.isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </Screen>
    );
  }

  if (!draft) {
    return (
      <Screen style={styles.center}>
        <Text variant="heading">Este plan ya no está disponible</Text>
        <Button label="Volver a mis planes" onPress={() => router.replace('/plans')} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text variant="title">Gestionar plan</Text>
        <Text variant="muted">
          {started
            ? 'El plan ya ha empezado: solo puedes cambiar las notas.'
            : 'Edita los datos o cancela el plan antes de que empiece.'}
        </Text>

        {staleWarning ? (
          <View style={styles.stale}>
            <Text style={styles.staleText}>
              El plan cambió mientras editabas. Hemos recargado los datos; revisa y vuelve a
              guardar.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <AuthField
            label="Título"
            value={draft.title}
            onChangeText={(value) => set('title', value)}
            editable={!started}
          />
          <AuthField
            label="Descripción"
            value={draft.description}
            onChangeText={(value) => set('description', value)}
            multiline
            style={styles.multiline}
            editable={!started}
          />
          <DateTimeField
            label="Fecha y hora"
            value={draft.startsAt}
            onChange={(value) => set('startsAt', value)}
            minimumDate={new Date()}
            disabled={started}
          />

          {!started ? (
            <>
              <Text style={styles.groupLabel}>Duración</Text>
              <View style={styles.chips}>
                {durationOptions.map(([value, label]) => {
                  const selected = value === draft.durationMinutes;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => set('durationMinutes', value)}
                      style={[styles.chip, selected ? styles.chipSelected : null]}
                    >
                      <Text style={selected ? styles.chipSelectedText : styles.chipText}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.groupLabel}>Aforo</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.unlimitedCapacity }}
                onPress={() => set('unlimitedCapacity', !draft.unlimitedCapacity)}
                style={styles.checkRow}
              >
                <View style={[styles.checkbox, draft.unlimitedCapacity ? styles.checkboxOn : null]}>
                  {draft.unlimitedCapacity ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>Sin límite de plazas</Text>
              </Pressable>
              {!draft.unlimitedCapacity ? (
                <AuthField
                  label="Número de plazas"
                  value={draft.capacity}
                  onChangeText={(value) => set('capacity', value)}
                  keyboardType="number-pad"
                />
              ) : null}

              <Text style={styles.groupLabel}>Acceso</Text>
              {accessModeOptions.map(([value, label, hint]) => {
                const selected = value === draft.accessMode;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => set('accessMode', value)}
                    style={[styles.option, selected ? styles.optionSelected : null]}
                  >
                    <Text style={styles.optionTitle}>{label}</Text>
                    <Text style={styles.optionHint}>{hint}</Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          <AuthField
            label="Notas"
            value={draft.notes}
            onChangeText={(value) => set('notes', value)}
            multiline
            style={styles.multiline}
          />

          {formError ? (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {formError}
            </Text>
          ) : null}
          <Button
            label="Guardar cambios"
            loading={mutation.isPending}
            onPress={() => mutation.mutate()}
          />
        </View>

        <View style={styles.card}>
          <Text variant="heading">Participación</Text>
          <Button
            label="Solicitudes y participantes"
            variant="secondary"
            onPress={() => router.push(`/events/${id}/participants`)}
          />
          {draft.accessMode === 'privateInvitation' ? (
            <Button
              label="Invitaciones"
              variant="secondary"
              onPress={() => router.push(`/events/${id}/invitations`)}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text variant="heading">Cancelar el plan</Text>
          <Text variant="muted">
            El plan deja de estar disponible y se avisa a las personas confirmadas.
          </Text>
          <Button
            label="Cancelar plan"
            variant="secondary"
            loading={cancelMutation.isPending}
            onPress={confirmCancel}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.lg,
  },
  groupLabel: {
    color: tokens.color.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: tokens.space.xs,
  },
  multiline: { minHeight: 88, paddingTop: tokens.space.sm, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
  },
  chipSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  chipText: { color: tokens.color.text, fontSize: 13, fontWeight: '600' },
  chipSelectedText: { color: tokens.color.primary, fontSize: 13, fontWeight: '700' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm, minHeight: 48 },
  checkbox: {
    alignItems: 'center',
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.sm,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxOn: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  checkmark: { color: tokens.color.primaryText, fontSize: 14, fontWeight: '700' },
  checkLabel: { color: tokens.color.text, fontSize: 14 },
  option: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 2,
    padding: tokens.space.md,
  },
  optionSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  optionTitle: { color: tokens.color.text, fontSize: 14, fontWeight: '700' },
  optionHint: { color: tokens.color.textMuted, fontSize: 12, lineHeight: 17 },
  stale: { backgroundColor: '#FFF3E6', borderRadius: tokens.radius.md, padding: tokens.space.md },
  staleText: { color: '#8A4B12', fontSize: 13, lineHeight: 18 },
  fieldError: { color: tokens.color.danger, fontSize: 13, lineHeight: 18 },
});
