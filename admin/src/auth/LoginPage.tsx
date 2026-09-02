import { Button, Card, TextInput, Title } from '@tremor/react';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('No se pudo iniciar sesión. Revisa el correo y la contraseña.');
      setBusy(false);
    }
    // On success the auth listener in SessionProvider swaps the view.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-tremor-background-muted p-4">
      <Card className="w-full max-w-sm">
        <Title>Joinly · Moderación</Title>
        <p className="mt-1 text-tremor-default text-tremor-content">
          Acceso restringido a cuentas con rol de administrador.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <TextInput
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onValueChange={setEmail}
            autoComplete="username"
            required
          />
          <TextInput
            type="password"
            placeholder="Contraseña"
            value={password}
            onValueChange={setPassword}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-tremor-default text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={busy}>
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
