import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '@/ui';

export default function Home() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState title={t('home.title')} description={t('home.placeholder')} />
    </Screen>
  );
}
