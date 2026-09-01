import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMe, searchEvents, type EventDiscovery } from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { useSession } from '@/auth/session';
import {
  availabilityLabel,
  categoryLabel,
  distanceLabel,
  eventDate,
  type TimeFilter,
} from '@/events/discovery';
import { useEventSearch } from '@/events/search-store';
import { Button, Screen, Text, tokens } from '@/ui';

const timeFilters: [TimeFilter, string][] = [
  ['any', 'Ahora'],
  ['afternoon', 'Esta tarde'],
  ['tomorrow', 'Mañana'],
  ['weekend', 'Este finde'],
];

function matchesTimeFilter(event: EventDiscovery, filter: TimeFilter) {
  if (filter === 'any') return true;
  const startsAt = new Date(event.startsAt);
  const now = new Date();
  if (filter === 'afternoon')
    return startsAt.toDateString() === now.toDateString() && startsAt.getHours() >= 12;
  if (filter === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return startsAt.toDateString() === tomorrow.toDateString();
  }
  const day = startsAt.getDay();
  return day === 0 || day === 6;
}

function Radar({ events }: { events: EventDiscovery[] }) {
  const blipPositions = [styles.blip0, styles.blip1, styles.blip2];

  return (
    <View accessibilityLabel="Radar abstracto de eventos cercanos" style={styles.radar}>
      <View style={[styles.ring, styles.ringOuter]} />
      <View style={[styles.ring, styles.ringMiddle]} />
      <View style={[styles.ring, styles.ringInner]} />
      <View style={styles.radarCenter} />
      {events.slice(0, 3).map((event, index) => (
        <View key={event.id} style={[styles.blip, blipPositions[index]]}>
          <Text numberOfLines={1} style={styles.blipTitle}>
            {event.title}
          </Text>
          <Text style={styles.blipDistance}>{distanceLabel(event.distanceMeters)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSession((state) => state.token);
  const origin = useEventSearch((state) => state.origin);
  const radiusMeters = useEventSearch((state) => state.radiusMeters);
  const categories = useEventSearch((state) => state.categories);
  const timeFilter = useEventSearch((state) => state.timeFilter);
  const setRadiusMeters = useEventSearch((state) => state.setRadiusMeters);
  const setTimeFilter = useEventSearch((state) => state.setTimeFilter);
  const profileQuery = useQuery({ queryKey: ['me', token], queryFn: () => getMe(token) });
  const eventsQuery = useInfiniteQuery({
    queryKey: ['events', 'search', origin, radiusMeters, categories],
    queryFn: ({ pageParam }) =>
      searchEvents(token, {
        origin: { type: 'Point', coordinates: [origin!.longitude, origin!.latitude] },
        radiusMeters,
        categories: categories.length === 0 ? undefined : categories,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.data.page.nextCursor,
    enabled: Boolean(token && origin),
  });

  const allEvents = eventsQuery.data?.pages.flatMap((page) => page.data.items) ?? [];
  const events = allEvents.filter((event) => matchesTimeFilter(event, timeFilter));
  const suggestedRadius = eventsQuery.data?.pages[0]?.data.suggestedRadiusMeters;

  if (profileQuery.isLoading) {
    return (
      <Screen backgroundColor={tokens.color.brandNavy} style={styles.loadingScreen}>
        <ActivityIndicator color={tokens.color.primaryText} />
      </Screen>
    );
  }

  if (profileQuery.error instanceof ApiError && profileQuery.error.code === 'profile_required') {
    return <Redirect href="/profile-setup" />;
  }

  if (profileQuery.error) {
    return (
      <Screen backgroundColor={tokens.color.brandNavy} style={styles.loadingScreen}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('system.networkError')}</Text>
          <Button label={t('common.retry')} onPress={() => void profileQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  if (profileQuery.data && !profileQuery.data.data.emailVerified) {
    return <Redirect href="/verify-email" />;
  }

  if (profileQuery.data && !profileQuery.data.data.agreementsAccepted) {
    return <Redirect href="/profile-setup" />;
  }

  function openSearch() {
    router.push('/search');
  }

  return (
    <Screen backgroundColor={tokens.color.brandNavy} edges={['top']} style={styles.screen}>
      <FlatList
        data={events}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage)
            void eventsQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.topRow}>
                <Text style={styles.wordmark}>{t('common.appName').toLowerCase()}</Text>
                <View style={styles.topActions}>
                  <Pressable
                    accessibilityLabel={t('home.myEvents')}
                    accessibilityRole="button"
                    onPress={() => router.push('/events/mine')}
                    style={styles.profileButton}
                  >
                    <Text style={styles.profileButtonText}>{t('home.myEvents')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Abrir perfil"
                    accessibilityRole="button"
                    onPress={() => router.push('/profile')}
                    style={styles.profileButton}
                  >
                    <Text style={styles.profileButtonText}>Perfil</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
              <Text style={styles.title}>{t('home.title')}</Text>
              {origin ? (
                <Pressable
                  accessibilityLabel={t('home.changeSearch')}
                  accessibilityRole="button"
                  onPress={openSearch}
                  style={({ pressed }) => [styles.location, pressed ? styles.pressed : null]}
                >
                  <View style={styles.locationDot} />
                  <Text style={styles.locationLabel}>{origin.label}</Text>
                  <Text style={styles.radius}>{radiusMeters / 1000} km · Cambiar</Text>
                </Pressable>
              ) : null}
            </View>

            {!origin ? (
              <View style={styles.firstSearch}>
                <Text variant="heading">{t('home.locationTitle')}</Text>
                <Text variant="muted">{t('home.locationDescription')}</Text>
                <Button label={t('home.useLocation')} onPress={openSearch} />
              </View>
            ) : (
              <>
                <Radar events={events} />
                <View style={styles.timeFilters}>
                  {timeFilters.map(([filter, label]) => (
                    <Pressable
                      key={filter}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filter === timeFilter }}
                      onPress={() => setTimeFilter(filter)}
                      style={[
                        styles.timeFilter,
                        filter === timeFilter ? styles.timeFilterSelected : null,
                      ]}
                    >
                      <Text
                        style={
                          filter === timeFilter
                            ? styles.timeFilterTextSelected
                            : styles.timeFilterText
                        }
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {origin ? (
              <View style={styles.resultsHeading}>
                <Text variant="heading">{t('home.radar')}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={openSearch}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>{t('home.filter')}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item: event }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${event.title}, ${event.approximateArea}`}
            onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
            style={({ pressed }) => [styles.eventCard, pressed ? styles.pressed : null]}
          >
            <View style={styles.eventMark}>
              <Text style={styles.eventMarkText}>{event.title.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.category}>{categoryLabel(event.category).toUpperCase()}</Text>
              <Text variant="heading" numberOfLines={1}>
                {event.title}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {eventDate(event.startsAt)} · {event.approximateArea}
              </Text>
            </View>
            <Text style={styles.availability}>{availabilityLabel(event)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          origin && !eventsQuery.isLoading ? (
            <View style={styles.empty}>
              <Text variant="heading">{t('home.emptyTitle')}</Text>
              <Text variant="muted">{t('home.emptyDescription')}</Text>
              {suggestedRadius ? (
                <Button
                  label={t('home.expandRadius', { radius: suggestedRadius / 1000 })}
                  onPress={() => setRadiusMeters(suggestedRadius)}
                />
              ) : null}
            </View>
          ) : null
        }
        ListFooterComponent={
          eventsQuery.isLoading || eventsQuery.isFetchingNextPage ? (
            <ActivityIndicator color={tokens.color.primaryText} style={styles.loader} />
          ) : null
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.createEvent')}
        onPress={() => router.push('/events/new')}
        style={({ pressed }) => [styles.fab, pressed ? styles.pressed : null]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: tokens.space.xxl },
  hero: { paddingHorizontal: tokens.space.xl, paddingTop: tokens.space.lg, gap: tokens.space.sm },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: tokens.space.lg },
  wordmark: { color: tokens.color.primaryText, fontSize: 16, fontWeight: '700' },
  profileButton: { justifyContent: 'center', minHeight: 48 },
  profileButtonText: { color: '#B8C7FF', fontSize: 13, fontWeight: '700' },
  fab: {
    alignItems: 'center',
    backgroundColor: tokens.color.accent,
    borderRadius: 28,
    bottom: tokens.space.xl,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: tokens.space.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 56,
  },
  fabPlus: { color: '#3A1D00', fontSize: 30, fontWeight: '700', lineHeight: 34 },
  eyebrow: { color: '#B8C7FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: tokens.color.primaryText, fontSize: 30, fontWeight: '700', lineHeight: 38 },
  location: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#22356B',
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
  },
  locationDot: { backgroundColor: tokens.color.accent, borderRadius: 4, height: 8, width: 8 },
  locationLabel: { color: tokens.color.primaryText, fontSize: 13, fontWeight: '600' },
  radius: { color: '#B8C7FF', fontSize: 13 },
  firstSearch: {
    backgroundColor: tokens.color.bg,
    borderRadius: 28,
    gap: tokens.space.md,
    marginTop: tokens.space.xxl,
    padding: tokens.space.xl,
  },
  radar: {
    height: 252,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.xl,
    position: 'relative',
  },
  ring: { borderColor: '#4966B6', borderRadius: 999, borderWidth: 1, position: 'absolute' },
  ringOuter: { height: 252, left: 0, top: 0, width: 252 },
  ringMiddle: { height: 168, left: 42, top: 42, width: 168 },
  ringInner: { height: 84, left: 84, top: 84, width: 84 },
  radarCenter: {
    backgroundColor: tokens.color.accent,
    borderColor: tokens.color.primaryText,
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    left: 116,
    position: 'absolute',
    top: 116,
    width: 20,
  },
  blip: {
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.sm,
    maxWidth: 116,
    padding: tokens.space.sm,
    position: 'absolute',
  },
  blip0: { right: 0, top: 20 },
  blip1: { bottom: 12, right: 6 },
  blip2: { left: 0, top: 100 },
  blipTitle: { color: tokens.color.brandNavy, fontSize: 12, fontWeight: '700' },
  blipDistance: { color: tokens.color.textMuted, fontSize: 11, marginTop: 2 },
  timeFilters: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    marginVertical: tokens.space.lg,
  },
  timeFilter: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.sm,
  },
  timeFilterSelected: { backgroundColor: tokens.color.primary },
  timeFilterText: { color: tokens.color.text, fontSize: 12, fontWeight: '600' },
  timeFilterTextSelected: { color: tokens.color.primaryText, fontSize: 12, fontWeight: '700' },
  resultsHeading: {
    alignItems: 'center',
    backgroundColor: tokens.color.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.xl,
  },
  filterButton: { minHeight: 48, justifyContent: 'center' },
  filterButtonText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  eventCard: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    gap: tokens.space.md,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.md,
    padding: tokens.space.md,
  },
  eventMark: {
    alignItems: 'center',
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.sm,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  eventMarkText: { color: tokens.color.primary, fontSize: 20, fontWeight: '700' },
  eventDetails: { flex: 1, gap: 2 },
  category: { color: tokens.color.purple, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  availability: { color: tokens.color.textMuted, fontSize: 11, maxWidth: 70, textAlign: 'right' },
  empty: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    gap: tokens.space.md,
    margin: tokens.space.xl,
    padding: tokens.space.lg,
  },
  loader: { margin: tokens.space.xl },
  pressed: { opacity: 0.82 },
  errorBox: { gap: tokens.space.lg, paddingHorizontal: tokens.space.xl },
  errorTitle: {
    color: tokens.color.primaryText,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
