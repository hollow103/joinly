import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { getMyEvents, type EventDetail } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { categoryLabel, eventDate } from '@/events/discovery';
import { Button, Screen, Text, tokens } from '@/ui';

const statusFilters: [string, string][] = [
  ['published', 'Publicados'],
  ['cancelled', 'Cancelados'],
  ['closed', 'Pasados'],
];

const statusText: Record<string, string> = {
  published: 'Publicado',
  cancelled: 'Cancelado',
  closed: 'Finalizado',
};

export default function MyEvents() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const [status, setStatus] = useState('published');

  const query = useInfiniteQuery({
    queryKey: ['me', 'events', status],
    queryFn: ({ pageParam }) => getMyEvents(token, { status, cursor: pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.data.page.nextCursor,
    enabled: Boolean(token),
  });

  const events = query.data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <FlatList
        data={events}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text variant="title">Mis planes</Text>
              <Button label="Crear" onPress={() => router.push('/create')} variant="text" />
            </View>
            <Text variant="muted">
              Los planes que organizas. Tócalos para editarlos o cancelarlos.
            </Text>
            <View style={styles.filters}>
              {statusFilters.map(([value, label]) => {
                const selected = value === status;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setStatus(value)}
                    style={[styles.filter, selected ? styles.filterSelected : null]}
                  >
                    <Text style={selected ? styles.filterTextSelected : styles.filterText}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <EventRow
            event={item}
            statusLabel={statusText[status] ?? ''}
            onPress={() => router.push(`/events/edit/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={tokens.color.primary} style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              <Text variant="heading">Nada por aquí</Text>
              <Text variant="muted">No tienes planes en este estado.</Text>
              {status === 'published' ? (
                <Button label="Crear tu primer plan" onPress={() => router.push('/create')} />
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={tokens.color.primary} style={styles.loader} />
          ) : null
        }
      />
    </Screen>
  );
}

function EventRow({
  event,
  statusLabel,
  onPress,
}: {
  event: EventDetail;
  statusLabel: string;
  onPress: () => void;
}) {
  const capacityText =
    event.capacity == null
      ? 'Plazas abiertas'
      : `${event.confirmedCount}/${event.capacity} confirmadas`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.category}>{categoryLabel(event.category).toUpperCase()}</Text>
        <Text variant="heading" numberOfLines={1}>
          {event.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {eventDate(event.startsAt)} · {event.approximateArea}
        </Text>
        <Text variant="caption">
          {statusLabel} · {capacityText}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { paddingBottom: tokens.space.xxl },
  header: { gap: tokens.space.sm, padding: tokens.space.lg },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  filters: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm },
  filter: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  filterSelected: { backgroundColor: tokens.color.primary },
  filterText: { color: tokens.color.text, fontSize: 13, fontWeight: '600' },
  filterTextSelected: { color: tokens.color.primaryText, fontSize: 13, fontWeight: '700' },
  row: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    gap: tokens.space.md,
    marginHorizontal: tokens.space.lg,
    marginTop: tokens.space.md,
    padding: tokens.space.md,
  },
  rowMain: { flex: 1, gap: 2 },
  category: { color: tokens.color.purple, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chevron: { color: tokens.color.textMuted, fontSize: 24 },
  empty: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    gap: tokens.space.md,
    margin: tokens.space.lg,
    padding: tokens.space.lg,
  },
  loader: { margin: tokens.space.xl },
  pressed: { opacity: 0.82 },
});
