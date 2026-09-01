import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createInvitation, revokeInvitation, type Invitation } from '@/api/endpoints';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { Button, Screen, Text, tokens } from '@/ui';

export default function Invitations() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((state) => state.token);

  const [maxUses, setMaxUses] = useState('');
  // No GET /invitations exists, so invitations created in this session are held
  // here: the code is shown once and can be copied or revoked before leaving.
  const [created, setCreated] = useState<Invitation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const parsed = maxUses.trim() ? Number(maxUses.trim()) : undefined;
      return createInvitation(token, id, parsed ? { maxUses: parsed } : {});
    },
    onSuccess: (result) => {
      setError(null);
      setMaxUses('');
      setCreated((current) => [result.data, ...current]);
    },
    onError: () => setError('No se pudo crear la invitación.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(token, id, invitationId),
    onSuccess: (_result, invitationId) => {
      setCreated((current) => current.filter((invitation) => invitation.id !== invitationId));
    },
    onError: () => setError('No se pudo revocar la invitación.'),
  });

  async function copy(invitation: Invitation) {
    await Clipboard.setStringAsync(invitation.code);
    setCopiedId(invitation.id);
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
        <Text variant="title">Invitaciones</Text>
        <Text variant="muted">
          Crea un código para tu plan privado. El código se muestra una sola vez: cópialo y
          compártelo con quien quieras invitar.
        </Text>

        <View style={styles.card}>
          <AuthField
            label="Usos máximos (opcional)"
            value={maxUses}
            onChangeText={setMaxUses}
            keyboardType="number-pad"
            placeholder="Sin límite"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Crear invitación"
            loading={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          />
        </View>

        {created.map((invitation) => (
          <View key={invitation.id} style={styles.card}>
            <Text style={styles.codeLabel}>Código</Text>
            <Text selectable style={styles.code}>
              {invitation.code}
            </Text>
            {invitation.maxUses != null ? (
              <Text variant="caption">Usos máximos: {invitation.maxUses}</Text>
            ) : null}
            <Text variant="caption">Este código no se volverá a mostrar.</Text>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Button
                  label={copiedId === invitation.id ? 'Copiado' : 'Copiar'}
                  variant="secondary"
                  onPress={() => copy(invitation)}
                />
              </View>
              <View style={styles.rowItem}>
                <Button
                  label="Revocar"
                  variant="secondary"
                  loading={revokeMutation.isPending}
                  onPress={() => revokeMutation.mutate(invitation.id)}
                />
              </View>
            </View>
          </View>
        ))}
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
  codeLabel: {
    color: tokens.color.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  code: { color: tokens.color.text, fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: tokens.space.sm },
  rowItem: { flex: 1 },
  error: { color: tokens.color.danger, fontSize: 13, lineHeight: 18 },
});
