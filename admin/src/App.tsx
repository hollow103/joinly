import { Button, Callout, Card } from '@tremor/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/auth/LoginPage';
import { useSession } from '@/auth/session';
import { AppShell } from '@/components/AppShell';
import { ReportDetailPage } from '@/features/reports/ReportDetailPage';
import { ReportsQueuePage } from '@/features/reports/ReportsQueuePage';

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-tremor-background-muted p-4">
      <Card className="w-full max-w-md space-y-4">{children}</Card>
    </main>
  );
}

export function App() {
  const { state, signOut, reloadProfile } = useSession();

  if (state.phase === 'loading') {
    return <CenteredCard>Cargando…</CenteredCard>;
  }

  if (state.phase === 'anonymous') {
    return <LoginPage />;
  }

  if (state.profileError) {
    return (
      <CenteredCard>
        <Callout title="No se pudo verificar la cuenta" color="red">
          {state.profileError}
        </Callout>
        <div className="flex gap-2">
          <Button size="xs" onClick={() => void reloadProfile()}>
            Reintentar
          </Button>
          <Button size="xs" variant="secondary" onClick={() => void signOut()}>
            Salir
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (state.profile?.role !== 'admin') {
    return (
      <CenteredCard>
        <Callout title="Sin permisos de administrador" color="amber">
          Esta cuenta ha iniciado sesión pero no tiene el rol <code>admin</code>. Pide que te
          asignen el rol (proceso manual documentado en{' '}
          <code>docs/17-identidad-y-administracion.md</code>).
        </Callout>
        <Button size="xs" variant="secondary" onClick={() => void signOut()}>
          Salir
        </Button>
      </CenteredCard>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/reports" element={<ReportsQueuePage />} />
        <Route path="/reports/:reportId" element={<ReportDetailPage />} />
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Routes>
    </AppShell>
  );
}
