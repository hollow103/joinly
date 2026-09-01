import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { supabase } from '@/auth/supabase';
import { Button, Screen, Text, tokens } from '@/ui';

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export default function SignIn() {
  const { t } = useTranslation();
  const { push, replace } = useRouter();
  const setSession = useSession((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setErrorMessage(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMessage(t('auth.signInError'));
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(t('auth.signInError'));
      return;
    }

    setSession(data.session);
    replace('/home');
  }

  return (
    <Screen backgroundColor={tokens.color.brandNavy} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.wordmark}>{t('common.appName').toLowerCase()}</Text>
            <Text style={styles.eyebrow}>{t('auth.eyebrow')}</Text>
            <Text style={styles.title}>{t('auth.signInTitle')}</Text>
          </View>

          <View style={styles.card}>
            <Text variant="heading">{t('auth.signInCta')}</Text>
            <Text variant="muted">{t('auth.signInSubtitle')}</Text>
            <AuthField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="tu@email.com"
              textContentType="emailAddress"
            />
            <AuthField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              placeholder="Tu contraseña"
              secureTextEntry
              textContentType="password"
            />
            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}
            <Button label={t('auth.signInCta')} loading={isSubmitting} onPress={submit} />
            <Button label={t('auth.signUpCta')} variant="text" onPress={() => push('./sign-up')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  hero: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: 56,
    paddingBottom: 48,
    gap: tokens.space.md,
  },
  wordmark: { color: tokens.color.surface, fontSize: 16, fontWeight: '700' },
  eyebrow: { color: '#B8C7FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: tokens.color.surface, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  card: {
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: tokens.space.xl,
    gap: tokens.space.lg,
  },
  error: { color: tokens.color.danger, fontSize: 13 },
});
