import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getParticipants, resolveParticipation, type Participant } from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { useSession } from '@/auth/session';
import { Button, Screen, Text, tokens } from '@/ui';

// A pending participation is always version 0 (nothing mutates it before the
// creator resolves it). A 412 here means it was resolved from another session;
// the list is refetched and the message tells the creator.
const PENDING_ETAG = '"participation-0"';

export default function Participants() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((state) => state.token);
  const [error, setError] = useState<string | null>(null);

  const pending = useQuery({
    queryKey: ['events', id, 'participants', 'pending'],
    queryFn: () => getParticipants(token, id, { status: 'pending', limit: 50 }),
    enabled: Boolean(id && token),
  });
  const confirmed = useQuery({
    queryKey: ['events', id, 'participants', 'confirmed'],
    queryFn: () => getParticipants(token, id, { status: 'confirmed', limit: 50 }),
    enabled: Boolean(id && token),
  });

  const resolveMutation = useMutation({
    mutationFn: (input: { participationId: string; status: 'confirmed' | 'rejected' }) =>
      resolveParticipation(token, id, input.participationId, input.status, PENDING_ETAG),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['events', id, 'participants'] });
      await queryClient.invalidateQueries({ queryKey: ['events', id] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'concurrent_update') {
        setError('Esa solicitud ya se había resuelto. Hemos actualizado la lista.');
        void pending.refetch();
        return;
      }
      if (err instanceof ApiError && err.code === 'event_full') {
        setError('El plan está completo: no quedan plazas para aprobar más solicitudes.');
        return;
      }
      setError('No se pudo resolver la solicitud.');
    },
  });

  const pendingItems = pending.data?.data.items ?? [];
  const confirmedItems = confirmed.data?.data.items ?? [];

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
        <Text variant="title">Solicitudes</Text>
        <Text variant="muted">
          Solo tú ves esta lista. Aprobar o rechazar no revela el resto de asistentes.
        </Text>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.section}>Pendientes</Text>
        {pending.isLoading ? (
          <ActivityIndicator color={tokens.color.primary} />
        ) : pendingItems.length === 0 ? (
          <Text variant="muted">No hay solicitudes pendientes.</Text>
        ) : (
          pendingItems.map((item) => (
            <PendingRow
              key={item.participationId}
              item={item}
              busy={resolveMutation.isPending}
              onApprove={() =>
                resolveMutation.mutate({
                  participationId: item.participationId,
                  status: 'confirmed',
                })
              }
              onReject={() =>
                resolveMutation.mutate({
                  participationId: item.participationId,
                  status: 'rejected',
                })
              }
            />
          ))
        )}

        <Text style={styles.section}>Confirmadas ({confirmedItems.length})</Text>
        {confirmed.isLoading ? (
          <ActivityIndicator color={tokens.color.primary} />
        ) : confirmedItems.length === 0 ? (
          <Text variant="muted">Todavía no hay participantes confirmados.</Text>
        ) : (
          confirmedItems.map((item) => (
            <View key={item.participationId} style={styles.confirmedRow}>
              <Text style={styles.alias}>{item.user.alias}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function PendingRow({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: Participant;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.pendingRow}>
      <Text style={styles.alias}>{item.user.alias}</Text>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Button label="Rechazar" variant="secondary" disabled={busy} onPress={onReject} />
        </View>
        <View style={styles.actionButton}>
          <Button label="Aprobar" disabled={busy} onPress={onApprove} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.md, paddingBottom: tokens.space.xxl },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  section: {
    color: tokens.color.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: tokens.space.md,
    textTransform: 'uppercase',
  },
  pendingRow: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    gap: tokens.space.md,
    padding: tokens.space.md,
  },
  confirmedRow: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
  },
  alias: { color: tokens.color.text, fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  actionButton: { flex: 1 },
  error: { color: tokens.color.danger, fontSize: 13, lineHeight: 18 },
});
