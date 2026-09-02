import { Badge, Button, Card, Divider, Text, Title } from '@tremor/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { formatDateTime } from '@/lib/format';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TARGET_LABELS,
  actionLabel,
  reasonLabel,
} from '@/lib/labels';
import type { AdminReport } from '@/lib/types';
import { DecisionForm } from './DecisionForm';
import { getReport } from './reportsApi';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-tremor-label uppercase tracking-wide text-tremor-content-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-tremor-default text-tremor-content-strong">{value}</dd>
    </div>
  );
}

export function ReportDetailPage() {
  const { reportId = '' } = useParams();

  const query = useQuery({
    queryKey: ['report', reportId],
    queryFn: async ({ signal }): Promise<{ data: AdminReport; etag: string | null }> => {
      const { data, etag } = await getReport(reportId, signal);
      return { data, etag };
    },
  });

  return (
    <div className="space-y-4">
      <Link to="/reports" className="text-tremor-default text-tremor-brand hover:underline">
        ← Volver a la cola
      </Link>

      {query.isLoading && <Text>Cargando…</Text>}

      {query.isError && (
        <Card>
          <Text className="text-red-600">
            {query.error instanceof Error ? query.error.message : 'No se pudo cargar el reporte.'}
          </Text>
          <Button
            className="mt-3"
            variant="secondary"
            size="xs"
            onClick={() => void query.refetch()}
          >
            Reintentar
          </Button>
        </Card>
      )}

      {query.data && (
        <>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Title>Reporte de {TARGET_LABELS[query.data.data.targetType].toLowerCase()}</Title>
                <Text>{reasonLabel(query.data.data.reason)}</Text>
              </div>
              <Badge color={STATUS_COLORS[query.data.data.status]}>
                {STATUS_LABELS[query.data.data.status]}
              </Badge>
            </div>

            <Divider />

            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="ID del reporte" value={query.data.data.id} />
              <Field label="Creado" value={formatDateTime(query.data.data.createdAt)} />
              <Field
                label={`ID del ${TARGET_LABELS[query.data.data.targetType].toLowerCase()}`}
                value={query.data.data.targetId}
              />
              <Field label="ID de quien reporta" value={query.data.data.reporterId} />
              <Field
                label="Descripción"
                value={query.data.data.description?.trim() || 'Sin descripción'}
              />
              <Field
                label="Última actualización"
                value={formatDateTime(query.data.data.updatedAt)}
              />
            </dl>

            {query.data.data.status !== 'pending' && (
              <>
                <Divider />
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="Acción aplicada" value={actionLabel(query.data.data.action)} />
                  <Field label="Decidido" value={formatDateTime(query.data.data.decidedAt)} />
                  <Field label="Decidido por" value={query.data.data.decidedBy ?? '—'} />
                  <Field label="Nota interna" value={query.data.data.note?.trim() || '—'} />
                </dl>
              </>
            )}
          </Card>

          {query.data.data.status === 'pending' && (
            <Card>
              <Title className="mb-3">Decidir</Title>
              <DecisionForm report={query.data.data} etag={query.data.etag} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
