import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { deleteMe, getMe, updateMe } from '@/api/endpoints';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { supabase } from '@/auth/supabase';
import { Button, Screen, Text, tokens } from '@/ui';

const HUB_LINKS: { label: string; href: Href }[] = [
  { label: 'Personas bloqueadas', href: '/blocks' },
  { label: 'Notificaciones', href: '/notifications' },
  { label: 'Normas de convivencia', href: '/guidelines' },
];

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSession((state) => state.token);
  const clearSession = useSession((state) => state.clear);
  const profileQuery = useQuery({ queryKey: ['me', token], queryFn: () => getMe(token) });
  const [alias, setAlias] = useState<string | null>(null);
  const profile = profileQuery.data?.data;
  const currentAlias = alias ?? profile?.alias ?? '';
  const updateMutation = useMutation({
    mutationFn: () =>
      updateMe(
        token,
        {
          alias: currentAlias.trim(),
          adultConfirmed: true,
          termsVersion: profile!.termsVersion,
          privacyVersion: profile!.privacyVersion,
          guidelinesVersion: profile!.guidelinesVersion,
        },
        profileQuery.data?.etag ?? undefined,
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteMe(token),
    onSuccess: async () => {
      await supabase.auth.signOut();
      clearSession();
      router.replace('/sign-in');
    },
  });

  function confirmDeletion() {
    Alert.alert(
      'Eliminar cuenta',
      'Solicitarás la supresión de tu cuenta. Esta acción no se puede deshacer desde la aplicación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar cuenta', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Tu perfil</Text>
        <Text variant="muted">
          Tu alias es visible en los eventos que publiques. Tu correo no se muestra a otras
          personas.
        </Text>

        <View style={styles.card}>
          <Text variant="heading">Editar perfil</Text>
          <AuthField
            label="Alias"
            value={currentAlias}
            onChangeText={setAlias}
            autoCapitalize="none"
          />
          <Button
            label="Guardar cambios"
            loading={updateMutation.isPending}
            disabled={currentAlias.trim().length < 3}
            onPress={() => updateMutation.mutate()}
          />
          {updateMutation.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              No pudimos guardar los cambios. Actualiza la pantalla e inténtalo de nuevo.
            </Text>
          ) : null}
        </View>

        <View style={styles.hub}>
          {HUB_LINKS.map((link, index) => (
            <Pressable
              key={link.label}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              onPress={() => router.push(link.href)}
              style={({ pressed }) => [
                styles.hubRow,
                index > 0 ? styles.hubRowBordered : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.hubLabel}>{link.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text variant="heading">Cuenta</Text>
          <Text variant="muted">
            Puedes solicitar la supresión de tus datos. El proceso se completará en el plazo
            indicado en la política de privacidad.
          </Text>
          <Button
            label="Eliminar cuenta"
            variant="secondary"
            loading={deleteMutation.isPending}
            onPress={confirmDeletion}
          />
          {deleteMutation.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              No pudimos solicitar la eliminación de la cuenta.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.lg,
  },
  hub: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  hubRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: tokens.space.lg,
  },
  hubRowBordered: { borderTopColor: tokens.color.border, borderTopWidth: 1 },
  hubLabel: { color: tokens.color.text, fontSize: 15 },
  chevron: { color: tokens.color.textMuted, fontSize: 22 },
  pressed: { opacity: 0.7 },
  error: { color: tokens.color.danger, fontSize: 13 },
});
