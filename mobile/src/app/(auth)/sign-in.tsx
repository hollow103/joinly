import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getMe } from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { env } from '@/config/env';
import { Button, Card, Screen, Text, tokens } from '@/ui';

export default function SignIn() {
  const { t } = useTranslation();

  // M0 probe: exercise the auth chain with no token. A 401 is the healthy result.
  const probe = useQuery({
    queryKey: ['probe', 'me'],
    queryFn: () => getMe(null),
    retry: false,
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">{t('common.appName')}</Text>
        <Text variant="muted">{t('auth.signInSubtitle')}</Text>
      </View>

      <Card>
        <Text variant="heading">{t('system.title')}</Text>
        <Field label={t('system.apiBase')} value={env.apiBaseUrl} />
        <Field label={t('system.session')} value={sessionLabel()} />
      </Card>

      <Button label={t('auth.signInCta')} disabled accessibilityHint={t('auth.comingSoon')} />
    </Screen>
  );

  function sessionLabel(): string {
    if (probe.isLoading) return t('common.loading');
    if (probe.error instanceof ApiError) {
      if (probe.error.status === 401) return t('system.anonymousOk');
      if (probe.error.status === 0) return t('system.networkError');
      return `${probe.error.status} · ${probe.error.code}`;
    }
    if (probe.isSuccess) return t('system.unexpected');
    return '—';
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.space.sm },
  field: { gap: 2 },
});
