import { Button, Callout, Select, SelectItem, Textarea } from '@tremor/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { ACTION_LABELS } from '@/lib/labels';
import type { AdminReport, DecisionStatus, ModerationActionValue } from '@/lib/types';
import { decideReport } from './reportsApi';

const ACTIONS_BY_TARGET: Record<'user' | 'event', ModerationActionValue[]> = {
  event: ['none', 'hideEvent'],
  user: ['none', 'warnUser', 'suspendUser'],
};

export function DecisionForm({ report, etag }: { report: AdminReport; etag: string | null }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<DecisionStatus>('resolved');
  const [action, setAction] = useState<ModerationActionValue>('none');
  const [note, setNote] = useState('');
  const [staleEtag, setStaleEtag] = useState(false);

  const actionOptions = useMemo(() => {
    if (status === 'archived') return ['none'] as ModerationActionValue[];
    return ACTIONS_BY_TARGET[report.targetType];
  }, [status, report.targetType]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!etag) throw new ApiError(428, 'if_match_required', 'Falta el ETag del reporte.');
      const effectiveAction = status === 'archived' ? 'none' : action;
      return decideReport(
        report.id,
        { status, action: effectiveAction, note: note.trim() || undefined },
        etag,
      );
    },
    onSuccess: async ({ data }) => {
      queryClient.setQueryData(['report', report.id], { data, etag: null });
      await queryClient.invalidateQueries({ queryKey: ['report', report.id] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 412 || error.status === 428)) {
        setStaleEtag(true);
      }
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setStaleEtag(false);
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-tremor-default font-medium text-tremor-content-emphasis">
            Resolución
          </span>
          <Select
            className="mt-1"
            value={status}
            onValueChange={(value) => {
              const next = value as DecisionStatus;
              setStatus(next);
              if (next === 'archived') setAction('none');
            }}
          >
            <SelectItem value="resolved">Resolver</SelectItem>
            <SelectItem value="archived">Archivar (sin acción)</SelectItem>
          </Select>
        </label>

        <label className="block">
          <span className="text-tremor-default font-medium text-tremor-content-emphasis">
            Acción
          </span>
          <Select
            className="mt-1"
            value={action}
            onValueChange={(value) => setAction(value as ModerationActionValue)}
            disabled={status === 'archived'}
          >
            {actionOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {ACTION_LABELS[value]}
              </SelectItem>
            ))}
          </Select>
        </label>
      </div>

      <label className="block">
        <span className="text-tremor-default font-medium text-tremor-content-emphasis">
          Nota interna (opcional)
        </span>
        <Textarea
          className="mt-1"
          rows={3}
          value={note}
          onValueChange={setNote}
          placeholder="Contexto de la decisión para la auditoría."
        />
      </label>

      {staleEtag && (
        <Callout title="El reporte ha cambiado" color="amber">
          Otra persona lo ha modificado. Recarga la página para ver el estado actual antes de
          decidir.
        </Callout>
      )}

      {mutation.isError && !staleEtag && (
        <Callout title="No se pudo aplicar la decisión" color="red">
          {mutation.error instanceof Error ? mutation.error.message : 'Error desconocido.'}
        </Callout>
      )}

      {mutation.isSuccess && (
        <Callout title="Decisión aplicada" color="emerald">
          El reporte se ha actualizado.
        </Callout>
      )}

      <Button type="submit" loading={mutation.isPending} disabled={mutation.isSuccess}>
        Aplicar decisión
      </Button>
    </form>
  );
}
