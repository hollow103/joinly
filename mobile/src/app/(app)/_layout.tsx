import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/auth/session';

export default function AppLayout() {
  const status = useSession((s) => s.status);

  if (status !== 'authenticated') {
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
