import { Redirect } from 'expo-router';
import { useSession } from '@/auth/session';

export default function Index() {
  const status = useSession((s) => s.status);
  if (status === 'loading') return null;
  return <Redirect href={status === 'authenticated' ? '/home' : '/sign-in'} />;
}
