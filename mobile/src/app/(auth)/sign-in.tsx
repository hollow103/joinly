import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { supabase } from '@/auth/supabase';
import { Button, Logo, Screen, Text, tokens } from '@/ui';

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
    <Screen backgroundColor={tokens.color.bg} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Logo size={22} />
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
  eyebrow: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  card: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    marginHorizontal: tokens.space.lg,
    marginBottom: tokens.space.lg,
    padding: tokens.space.xl,
    gap: tokens.space.lg,
  },
  error: { color: tokens.color.danger, fontSize: 13 },
});
