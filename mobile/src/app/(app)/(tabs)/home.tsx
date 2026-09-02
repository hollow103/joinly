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
  timeFilterWindow,
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
  const timeWindow = timeFilterWindow(timeFilter);
  const eventsQuery = useInfiniteQuery({
    queryKey: ['events', 'search', origin, radiusMeters, categories, timeFilter],
    queryFn: ({ pageParam }) =>
      searchEvents(token, {
        origin: { type: 'Point', coordinates: [origin!.longitude, origin!.latitude] },
        radiusMeters,
        categories: categories.length === 0 ? undefined : categories,
        startsAfter: timeWindow.startsAfter,
        startsBefore: timeWindow.startsBefore,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.data.page.nextCursor,
    enabled: Boolean(token && origin),
  });

  const events = eventsQuery.data?.pages.flatMap((page) => page.data.items) ?? [];
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
      <View style={styles.fixedHeader}>
        <View style={styles.hero}>
          <View style={styles.topRow}>
            <Text style={styles.wordmark}>{t('common.appName').toLowerCase()}</Text>
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
            <View style={styles.radarStage}>
              <Radar events={events} />
            </View>
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
                      filter === timeFilter ? styles.timeFilterTextSelected : styles.timeFilterText
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
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
          </>
        )}
      </View>

      {origin ? (
        <View style={styles.eventListSurface}>
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
              !eventsQuery.isLoading ? (
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
                <ActivityIndicator color={tokens.color.primary} style={styles.loader} />
              ) : null
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 0, padding: 0 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  content: { backgroundColor: tokens.color.bg, paddingBottom: tokens.space.xxl },
  fixedHeader: { backgroundColor: tokens.color.bg, zIndex: 1 },
  hero: {
    backgroundColor: tokens.color.brandNavy,
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
  },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  wordmark: { color: tokens.color.primaryText, fontSize: 16, fontWeight: '700' },
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
    height: 208,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.xl,
    position: 'relative',
  },
  radarStage: { backgroundColor: tokens.color.brandNavy, paddingBottom: 28 },
  ring: { borderColor: '#4966B6', borderRadius: 999, borderWidth: 1, position: 'absolute' },
  ringOuter: { height: 208, left: '50%', marginLeft: -104, top: 0, width: 208 },
  ringMiddle: { height: 140, left: '50%', marginLeft: -70, top: 34, width: 140 },
  ringInner: { height: 72, left: '50%', marginLeft: -36, top: 68, width: 72 },
  radarCenter: {
    backgroundColor: tokens.color.accent,
    borderColor: tokens.color.primaryText,
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    left: '50%',
    marginLeft: -10,
    position: 'absolute',
    top: 94,
    width: 20,
  },
  blip: {
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.sm,
    maxWidth: 128,
    padding: tokens.space.sm,
    position: 'absolute',
  },
  blip0: { left: 18, top: 20 },
  blip1: { right: 0, top: 82 },
  blip2: { bottom: 0, left: 54 },
  blipTitle: { color: tokens.color.brandNavy, fontSize: 12, fontWeight: '700' },
  blipDistance: { color: tokens.color.textMuted, fontSize: 11, marginTop: 2 },
  timeFilters: {
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    elevation: 5,
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginHorizontal: tokens.space.lg,
    marginTop: -28,
    padding: 5,
    shadowColor: '#07133B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  timeFilter: {
    alignItems: 'center',
    borderRadius: tokens.radius.pill,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.sm,
  },
  timeFilterSelected: { backgroundColor: tokens.color.primary },
  timeFilterText: { color: tokens.color.text, fontSize: 12, fontWeight: '600' },
  timeFilterTextSelected: { color: tokens.color.primaryText, fontSize: 12, fontWeight: '700' },
  resultsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
  },
  eventListSurface: { backgroundColor: tokens.color.bg, flex: 1 },
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
