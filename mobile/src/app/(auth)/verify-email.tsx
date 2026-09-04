import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/auth/session';
import { supabase } from '@/auth/supabase';
import { Button, Screen, Text, tokens } from '@/ui';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const { replace } = useRouter();
  const queryClient = useQueryClient();
  const status = useSession((state) => state.status);
  const setSession = useSession((state) => state.setSession);
  const [isChecking, setIsChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // When the guard sent a signed-in but unverified user here, offer a re-check
  // that pulls a fresh session (and therefore fresh email_confirmed_at) before
  // handing control back to the home guard.
  async function recheck() {
    setNotYet(false);
    setIsChecking(true);
    const { data, error } = await supabase.auth.refreshSession();
    setIsChecking(false);
    if (error) {
      setNotYet(true);
      return;
    }
    setSession(data.session);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    replace('/home');
  }

  return (
    <Screen backgroundColor={tokens.color.bg} style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.mark} accessibilityElementsHidden>
          <View style={styles.markInner} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Revisa tu correo</Text>
          <Text style={styles.description}>{t('auth.accountCreated')}</Text>
        </View>
        <View style={styles.actions}>
          {status === 'authenticated' ? (
            <>
              <Button label="Ya he verificado mi correo" loading={isChecking} onPress={recheck} />
              {notYet ? (
                <Text accessibilityLiveRegion="polite" style={styles.notYet}>
                  Todavía no consta como verificado. Abre el enlace del correo y vuelve a
                  intentarlo.
                </Text>
              ) : null}
            </>
          ) : (
            <Button label="Volver al inicio de sesión" onPress={() => replace('/sign-in')} />
          )}
          <Text style={styles.note}>
            Cuando confirmes el correo desde el enlace, podrás continuar.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.xl },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space.xxl },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: tokens.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: tokens.color.accent },
  copy: { alignItems: 'center', gap: tokens.space.md },
  title: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  description: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sans,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  actions: { width: '100%', gap: tokens.space.lg },
  note: { color: tokens.color.textMuted, fontFamily: tokens.font.family.sans, fontSize: 13, textAlign: 'center' },
  notYet: { color: tokens.color.danger, fontFamily: tokens.font.family.sans, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
