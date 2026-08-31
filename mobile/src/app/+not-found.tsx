import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Text } from '@/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <Screen>
        <Text variant="heading">{t('notFound.title')}</Text>
        <Link href="/">
          <Text>{t('notFound.back')}</Text>
        </Link>
      </Screen>
    </>
  );
}
