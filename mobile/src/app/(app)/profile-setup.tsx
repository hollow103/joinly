import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { updateMe } from '@/api/endpoints';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { supabase } from '@/auth/supabase';
import { Button, Screen, Text, tokens } from '@/ui';

const agreementVersions = {
  termsVersion: 'v1',
  privacyVersion: 'v1',
  guidelinesVersion: 'v1',
} as const;

export default function ProfileSetup() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const [alias, setAlias] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      updateMe(token, { alias: alias.trim(), adultConfirmed: true, ...agreementVersions }),
    onSuccess: () => router.replace('/home'),
    onError: () =>
      setErrorMessage('No pudimos guardar tu perfil. Comprueba el alias e inténtalo de nuevo.'),
  });

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const storedAlias =
        typeof data.user?.user_metadata.alias === 'string' ? data.user.user_metadata.alias : '';
      setAlias(storedAlias);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen backgroundColor={tokens.color.bg} style={styles.screen}>
      <View style={styles.card}>
        <Text variant="title">Completa tu perfil</Text>
        <Text variant="muted">
          Tu alias será visible en los planes que publiques. Ya has aceptado los documentos v1
          durante el registro.
        </Text>
        <AuthField
          label="Alias"
          value={alias}
          onChangeText={setAlias}
          autoCapitalize="none"
          placeholder="Tu alias"
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}
        <Button
          label="Guardar y continuar"
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
          disabled={alias.trim().length < 3}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', padding: tokens.space.lg },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.lg,
    padding: tokens.space.xl,
  },
  error: { color: tokens.color.danger, fontSize: 13 },
});
