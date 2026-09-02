import {
  Badge,
  Button,
  Card,
  Tab,
  TabGroup,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from '@tremor/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, shortId } from '@/lib/format';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TARGET_LABELS,
  actionLabel,
  reasonLabel,
} from '@/lib/labels';
import type { ReportPage, ReportStatus } from '@/lib/types';
import { listReports } from './reportsApi';

const TABS: ReportStatus[] = ['pending', 'resolved', 'archived'];

export function ReportsQueuePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ReportStatus>('pending');

  const query = useInfiniteQuery({
    queryKey: ['reports', status],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listReports(status, pageParam, signal),
    getNextPageParam: (last: ReportPage) => last.page.nextCursor ?? undefined,
  });

  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <Title>Reportes</Title>
        <Text>Cola de moderación. Selecciona un reporte para revisarlo y decidir.</Text>
      </div>

      <TabGroup
        index={TABS.indexOf(status)}
        onIndexChange={(index) => setStatus(TABS[index] ?? 'pending')}
      >
        <TabList>
          {TABS.map((value) => (
            <Tab key={value}>{STATUS_LABELS[value]}</Tab>
          ))}
        </TabList>
      </TabGroup>

      <Card className="p-0">
        {query.isError ? (
          <div className="p-6">
            <Text className="text-red-600">
              {query.error instanceof Error
                ? query.error.message
                : 'No se pudieron cargar los reportes.'}
            </Text>
            <Button
              className="mt-3"
              variant="secondary"
              size="xs"
              onClick={() => void query.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : query.isLoading ? (
          <div className="p-6">
            <Text>Cargando…</Text>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <Text>No hay reportes {STATUS_LABELS[status].toLowerCase()}.</Text>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Creado</TableHeaderCell>
                <TableHeaderCell>Objetivo</TableHeaderCell>
                <TableHeaderCell>Motivo</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Acción</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer hover:bg-tremor-background-muted"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <TableCell>{formatDateTime(report.createdAt)}</TableCell>
                  <TableCell>
                    {TARGET_LABELS[report.targetType]} · {shortId(report.targetId)}
                  </TableCell>
                  <TableCell>{reasonLabel(report.reason)}</TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLORS[report.status]}>
                      {STATUS_LABELS[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{actionLabel(report.action)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}
