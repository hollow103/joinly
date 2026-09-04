import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  abandonParticipation,
  createBlock,
  getEvent,
  getMe,
  joinEvent,
  type EventDetail,
} from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { useSession } from '@/auth/session';
import {
  availabilityLabel,
  categoryColor,
  categoryLabel,
  distanceLabel,
  eventDate,
} from '@/events/discovery';
import { clearJoinIdempotencyKey, getJoinIdempotencyKey } from '@/lib/idempotency';
import { Button, Screen, Text, tokens } from '@/ui';

const joinErrorMessages: Record<string, string> = {
  event_full: 'Este plan ya no tiene plazas libres.',
  invitation_invalid: 'El código de invitación no es válido.',
  participation_exists: 'Ya tienes una participación en este plan.',
  cannot_join_own_event: 'No puedes unirte a un plan que has creado tú.',
  event_not_joinable: 'Este plan ya no admite nuevas participaciones.',
  event_started: 'El plan ya ha empezado.',
};

const abandonErrorMessages: Record<string, string> = {
  participation_not_confirmed: 'Solo puedes abandonar una participación confirmada.',
  event_started: 'El plan ya ha empezado y no puedes abandonarlo.',
};

function newReportHref(targetType: 'event' | 'user', targetId: string, targetName: string): Href {
  const params = new URLSearchParams({ targetType, targetId, targetName });
  return `/reports/new?${params.toString()}` as Href;
}

export default function EventDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((state) => state.token);

  const eventQuery = useQuery({
    queryKey: ['events', id],
    queryFn: () => getEvent(token, id),
    enabled: Boolean(id && token),
  });
  const meQuery = useQuery({ queryKey: ['me', token], queryFn: () => getMe(token) });

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const event = eventQuery.data?.data;
  const isCreator = Boolean(event && meQuery.data && meQuery.data.data.id === event.creator.id);
  const myParticipation = event?.myParticipation;
  const started = event ? new Date(event.startsAt).getTime() <= new Date().getTime() : false;

  const joinMutation = useMutation({
    mutationFn: async (invitationCode?: string) => {
      const key = await getJoinIdempotencyKey(id);
      const result = await joinEvent(token, id, key, invitationCode);
      await clearJoinIdempotencyKey(id);
      return result;
    },
    onSuccess: async () => {
      setCodeModalOpen(false);
      setCode('');
      await queryClient.invalidateQueries({ queryKey: ['events', id] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'search'] });
    },
    onError: (error) => {
      let message: string | null = null;
      if (error instanceof ApiError) {
        message = joinErrorMessages[error.code] ?? null;
        // A private event answers 404 for a missing or wrong code (non-disclosure).
        if (!message && error.status === 404 && codeModalOpen) {
          message = 'El código no es válido o el plan ya no está disponible.';
        }
      }
      setActionError(message ?? 'No se pudo completar la acción. Inténtalo de nuevo.');
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => createBlock(token, event!.creator.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', 'search'] });
      await queryClient.invalidateQueries({ queryKey: ['blocks'] });
      router.replace('/home');
    },
    onError: () => setActionError('No se pudo bloquear a esta persona.'),
  });

  function confirmBlock() {
    setActionError(null);
    Alert.alert(
      `Bloquear a ${event?.creator.alias ?? ''}`,
      'Dejaréis de ver los planes del otro y no podréis uniros. Es recíproco.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Bloquear', style: 'destructive', onPress: () => blockMutation.mutate() },
      ],
    );
  }

  const abandonMutation = useMutation({
    mutationFn: () => abandonParticipation(token, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', id] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'search'] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? (abandonErrorMessages[error.code] ?? null) : null;
      setActionError(message ?? 'No se pudo abandonar el plan.');
    },
  });

  function confirmJoin() {
    setActionError(null);
    const verb = event?.accessMode === 'approval' ? 'Solicitar plaza' : 'Unirme al plan';
    Alert.alert(verb, `¿Confirmas que quieres ${verb.toLowerCase()}?`, [
      { text: 'Volver', style: 'cancel' },
      { text: verb, onPress: () => joinMutation.mutate(undefined) },
    ]);
  }

  function confirmAbandon() {
    setActionError(null);
    Alert.alert('Abandonar plan', 'Liberarás tu plaza. Podrás volver a unirte si sigue abierto.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Abandonar', style: 'destructive', onPress: () => abandonMutation.mutate() },
    ]);
  }

  if (eventQuery.isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen style={styles.center}>
        <Text variant="heading">Este plan ya no está disponible</Text>
        <Button label="Volver al radar" onPress={router.back} />
      </Screen>
    );
  }

  const cta = renderCta();

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="Volver al radar"
          accessibilityRole="button"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver al radar</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={[styles.category, { color: categoryColor(event.category) }]}>
            {categoryLabel(event.category).toUpperCase()}
          </Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.heroDescription}>{event.description}</Text>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.meta}>{eventDate(event.startsAt)}</Text>
          <Text style={styles.meta}>{event.approximateArea}</Text>
          {event.distanceMeters !== undefined ? (
            <Text style={styles.meta}>{distanceLabel(event.distanceMeters)}</Text>
          ) : null}
          <Text style={styles.meta}>{availabilityLabel(event)}</Text>
        </View>

        <StatusBanner event={event} isCreator={isCreator} />

        {event.exactLocation ? (
          <View style={styles.exact}>
            <Text style={styles.exactLabel}>Ubicación exacta</Text>
            <Text style={styles.exactValue}>
              {event.exactLocation.coordinates[1].toFixed(5)},{' '}
              {event.exactLocation.coordinates[0].toFixed(5)}
            </Text>
          </View>
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              La ubicación exacta se muestra solo cuando tu participación está confirmada.
            </Text>
          </View>
        )}

        {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}

        <View style={styles.creator}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{event.creator.alias.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.creatorMain}>
            <Text variant="heading">Creado por {event.creator.alias}</Text>
            <Text variant="caption">Alias visible; sin datos de contacto</Text>
          </View>
          {!isCreator ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Bloquear a ${event.creator.alias}`}
              onPress={confirmBlock}
              style={styles.blockLink}
            >
              <Text style={styles.blockLinkText}>Bloquear</Text>
            </Pressable>
          ) : null}
        </View>

        {!isCreator ? (
          <View style={styles.safety}>
            <Text variant="heading">¿Algo no va bien?</Text>
            <Text variant="caption">
              Los reportes se revisan de forma privada. No compartiremos tu identidad con la persona
              reportada.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reportar este plan"
              onPress={() => router.push(newReportHref('event', event.id, event.title))}
              style={styles.reportLink}
            >
              <Text style={styles.reportLinkText}>Reportar este plan</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reportar a ${event.creator.alias}`}
              onPress={() =>
                router.push(newReportHref('user', event.creator.id, event.creator.alias))
              }
              style={styles.reportLink}
            >
              <Text style={styles.reportLinkText}>Reportar a {event.creator.alias}</Text>
            </Pressable>
          </View>
        ) : null}

        {actionError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {actionError}
          </Text>
        ) : null}
      </ScrollView>

      {cta ? <View style={styles.bottomBar}>{cta}</View> : null}

      <Modal
        visible={codeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeModalOpen(false)}
      >
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text variant="heading">Introduce el código</Text>
            <Text variant="muted">
              Este plan es privado. Pide el código a quien te invita para entrar.
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Código de invitación"
              placeholderTextColor={tokens.color.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.codeInput}
              accessibilityLabel="Código de invitación"
            />
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            <Button
              label="Unirme con el código"
              loading={joinMutation.isPending}
              disabled={code.trim().length === 0}
              onPress={() => {
                setActionError(null);
                joinMutation.mutate(code.trim());
              }}
            />
            <Button label="Cancelar" variant="text" onPress={() => setCodeModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );

  function renderCta() {
    if (isCreator) {
      return (
        <Button label="Gestionar este plan" onPress={() => router.push(`/events/edit/${id}`)} />
      );
    }
    if (myParticipation === 'confirmed') {
      return started ? null : (
        <Button
          label="Abandonar plan"
          variant="secondary"
          loading={abandonMutation.isPending}
          onPress={confirmAbandon}
        />
      );
    }
    if (myParticipation === 'pending') {
      return null;
    }
    if (started || event?.availability === 'full') {
      return null;
    }
    if (event?.accessMode === 'privateInvitation') {
      return (
        <Button
          label="Tengo un código"
          onPress={() => {
            setActionError(null);
            setCodeModalOpen(true);
          }}
        />
      );
    }
    return (
      <Button
        label={event?.accessMode === 'approval' ? 'Solicitar plaza' : 'Unirme al plan'}
        loading={joinMutation.isPending}
        onPress={confirmJoin}
      />
    );
  }
}

function StatusBanner({ event, isCreator }: { event: EventDetail; isCreator: boolean }) {
  if (isCreator) {
    return (
      <View style={[styles.banner, styles.bannerNeutral]}>
        <Text style={styles.bannerText}>Eres quien organiza este plan.</Text>
      </View>
    );
  }
  if (event.myParticipation === 'confirmed') {
    return (
      <View style={[styles.banner, styles.bannerOk]}>
        <Text style={styles.bannerText}>Participación confirmada. Nos vemos allí.</Text>
      </View>
    );
  }
  if (event.myParticipation === 'pending') {
    return (
      <View style={[styles.banner, styles.bannerPending]}>
        <Text style={styles.bannerText}>
          Solicitud enviada. Te avisaremos cuando quien organiza la revise.
        </Text>
      </View>
    );
  }
  if (event.myParticipation === 'rejected') {
    return (
      <View style={[styles.banner, styles.bannerNeutral]}>
        <Text style={styles.bannerText}>
          Tu solicitud anterior fue rechazada. Puedes volver a solicitar plaza.
        </Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: 96 },
  center: { alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 14,
  },
  hero: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.xl,
  },
  category: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.5,
  },
  heroDescription: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  meta: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    color: tokens.color.text,
    fontFamily: tokens.font.family.sans,
    fontSize: 13,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  banner: { borderRadius: tokens.radius.md, padding: tokens.space.lg },
  bannerOk: { backgroundColor: tokens.color.successSoft },
  bannerPending: { backgroundColor: tokens.color.primarySoft },
  bannerNeutral: { backgroundColor: tokens.color.primarySoft },
  bannerText: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  exact: {
    backgroundColor: tokens.color.successSoft,
    borderRadius: tokens.radius.md,
    gap: 2,
    padding: tokens.space.lg,
  },
  exactLabel: {
    color: tokens.color.success,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 11,
    letterSpacing: 1,
  },
  exactValue: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 16,
  },
  notice: {
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
  },
  noticeText: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  notes: { color: tokens.color.text, fontSize: 15, lineHeight: 23 },
  creator: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    gap: tokens.space.md,
    padding: tokens.space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: tokens.color.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 18,
  },
  creatorMain: { flex: 1 },
  blockLink: { justifyContent: 'center', minHeight: 48, paddingHorizontal: tokens.space.sm },
  blockLinkText: {
    color: tokens.color.danger,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 13,
  },
  safety: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: tokens.space.lg,
  },
  reportLink: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
  reportLinkText: {
    color: tokens.color.danger,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 14,
  },
  error: {
    color: tokens.color.danger,
    fontFamily: tokens.font.family.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    backgroundColor: tokens.color.bg,
    borderTopColor: tokens.color.border,
    borderTopWidth: 1,
    left: 0,
    padding: tokens.space.lg,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  scrim: {
    backgroundColor: 'rgba(30,27,22,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.xl,
  },
  codeInput: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    color: tokens.color.text,
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
  },
});
