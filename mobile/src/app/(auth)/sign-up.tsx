import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { AuthField } from '@/auth/AuthField';
import { supabase } from '@/auth/supabase';
import { Button, Screen, Text, tokens } from '@/ui';

const signUpSchema = z.object({
  alias: z.string().trim().min(3).max(30),
  email: z.string().trim().email(),
  password: z.string().min(8),
  ageConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  guidelinesAccepted: z.literal(true),
});

type AgreementKey = 'ageConfirmed' | 'termsAccepted' | 'privacyAccepted' | 'guidelinesAccepted';

export default function SignUp() {
  const { t } = useTranslation();
  const { back, push, replace } = useRouter();
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    ageConfirmed: false,
    termsAccepted: false,
    privacyAccepted: false,
    guidelinesAccepted: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agreementsAccepted = Object.values(agreements).every(Boolean);

  function toggleAgreement(key: AgreementKey) {
    setAgreements((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit() {
    setErrorMessage(null);
    const parsed = signUpSchema.safeParse({ alias, email, password, ...agreements });
    if (!parsed.success) {
      setErrorMessage(t('auth.agreementsRequired'));
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { alias: parsed.data.alias } },
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(t('auth.signUpError'));
      return;
    }

    replace('./verify-email');
  }

  return (
    <Screen backgroundColor={tokens.color.brandNavy} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={back}
              style={styles.back}
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.eyebrow}>{t('auth.eyebrow')}</Text>
            <Text style={styles.title}>{t('auth.signUpTitle')}</Text>
          </View>

          <View style={styles.card}>
            <Text variant="heading">{t('auth.createAccount')}</Text>
            <Text variant="muted">{t('auth.signUpSubtitle')}</Text>
            <AuthField
              label={t('auth.alias')}
              value={alias}
              onChangeText={setAlias}
              placeholder="Tu alias"
            />
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
              autoComplete="new-password"
              placeholder="8 caracteres o más"
              secureTextEntry
              textContentType="newPassword"
            />
            <View style={styles.agreements}>
              <Agreement
                label={t('auth.age')}
                selected={agreements.ageConfirmed}
                onPress={() => toggleAgreement('ageConfirmed')}
              />
              <Agreement
                label={t('auth.terms')}
                selected={agreements.termsAccepted}
                onPress={() => toggleAgreement('termsAccepted')}
                onRead={() => push('/legal/terms')}
              />
              <Agreement
                label={t('auth.privacy')}
                selected={agreements.privacyAccepted}
                onPress={() => toggleAgreement('privacyAccepted')}
                onRead={() => push('/legal/privacy')}
              />
              <Agreement
                label={t('auth.guidelines')}
                selected={agreements.guidelinesAccepted}
                onPress={() => toggleAgreement('guidelinesAccepted')}
                onRead={() => push('/legal/guidelines')}
              />
            </View>
            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}
            <Button
              label={t('auth.createAccount')}
              loading={isSubmitting}
              disabled={!agreementsAccepted}
              onPress={submit}
              accessibilityHint={!agreementsAccepted ? t('auth.agreementsRequired') : undefined}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Agreement({
  label,
  selected,
  onPress,
  onRead,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onRead?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.agreement, pressed ? styles.pressed : null]}
    >
      <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.agreementText}>{label}</Text>
      {onRead ? (
        <Pressable accessibilityRole="link" onPress={onRead} style={styles.readLink}>
          <Text style={styles.readLinkText}>Leer</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: 28,
    paddingBottom: 32,
    gap: tokens.space.md,
  },
  back: { width: 48, height: 48, justifyContent: 'center' },
  backText: { color: tokens.color.surface, fontSize: 28, lineHeight: 32 },
  eyebrow: { color: '#B8C7FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: tokens.color.surface, fontSize: 30, fontWeight: '700', lineHeight: 36 },
  card: {
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: tokens.space.xl,
    gap: tokens.space.lg,
  },
  agreements: { gap: tokens.space.sm },
  agreement: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  pressed: { opacity: 0.78 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  checkmark: { color: tokens.color.primaryText, fontSize: 14, fontWeight: '700' },
  agreementText: { flex: 1, fontSize: 13, color: tokens.color.textMuted },
  readLink: { minHeight: 48, justifyContent: 'center' },
  readLinkText: { color: tokens.color.primary, fontSize: 13, fontWeight: '700' },
  error: { color: tokens.color.danger, fontSize: 13 },
});
