import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMe, searchEvents, type EventDiscovery } from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { useSession } from '@/auth/session';
import {
  availabilityLabel,
  categoryColor,
  categoryLabel,
  distanceLabel,
  eventDate,
  timeFilterWindow,
  type TimeFilter,
} from '@/events/discovery';
import { useEventSearch } from '@/events/search-store';
import { Button, Logo, Screen, Text, tokens } from '@/ui';

const timeFilters: [TimeFilter, string][] = [
  ['any', 'Ahora'],
  ['afternoon', 'Esta tarde'],
  ['tomorrow', 'Mañana'],
  ['weekend', 'Este finde'],
];

/**
 * Radar de la Dirección H: un orbe luminoso tras cristal. El resplandor son
 * círculos periwinkle concéntricos de opacidad baja; los anillos, filos blancos;
 * el núcleo, el "estás aquí". Los planes cercanos son píldoras esmeriladas.
 */
function Radar({ events, onSelect }: { events: EventDiscovery[]; onSelect: (id: string) => void }) {
  const blipPositions = [styles.blip0, styles.blip1, styles.blip2];
  const shown = events.slice(0, 3);

  return (
    <View accessibilityLabel={`Radar: ${events.length} planes cerca`} style={styles.radar}>
      <View style={[styles.orbGlow, styles.orbGlow3]} />
      <View style={[styles.orbGlow, styles.orbGlow2]} />
      <View style={[styles.orbGlow, styles.orbGlow1]} />
      <View style={[styles.orbRing, styles.orbRingOuter]} />
      <View style={[styles.orbRing, styles.orbRingInner]} />
      <View style={styles.orbCoreHalo} />
      <View style={styles.orbCore} />
      {shown.map((event, index) => (
        <Pressable
          key={event.id}
          accessibilityRole="button"
          accessibilityLabel={`${event.title}, ${distanceLabel(event.distanceMeters)}`}
          hitSlop={10}
          onPress={() => onSelect(event.id)}
          style={({ pressed }) => [
            styles.blip,
            blipPositions[index],
            pressed ? styles.blipPressed : null,
          ]}
        >
          <View style={styles.blipHead}>
            <View style={[styles.blipDot, { backgroundColor: categoryColor(event.category) }]} />
            <Text numberOfLines={1} style={styles.blipTitle}>
              {event.title}
            </Text>
          </View>
          <Text style={styles.blipDistance}>{distanceLabel(event.distanceMeters)}</Text>
        </Pressable>
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
      <Screen style={styles.loadingScreen}>
        <ActivityIndicator color={tokens.color.primary} />
      </Screen>
    );
  }

  if (profileQuery.error instanceof ApiError && profileQuery.error.code === 'profile_required') {
    return <Redirect href="/profile-setup" />;
  }

  if (profileQuery.error) {
    return (
      <Screen style={styles.loadingScreen}>
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

  function openEvent(id: string) {
    router.push({ pathname: '/events/[id]', params: { id } });
  }

  return (
    <Screen edges={['top']} style={styles.screen}>
      <View style={styles.fixedHeader}>
        <View style={styles.hero}>
          <Logo size={22} />
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
              <Text style={styles.radius}>· {radiusMeters / 1000} km</Text>
              <Ionicons name="chevron-forward" size={14} color={tokens.color.primary} />
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
            <View style={styles.radarCard}>
              <Text style={styles.radarCaption}>
                {events.length === 1 ? '1 plan cerca' : `${events.length} planes cerca`} · zonas
                aproximadas
              </Text>
              <Radar events={events} onSelect={openEvent} />
              <Text style={styles.radarHint}>Toca un punto para abrir el plan</Text>
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
                accessibilityLabel="Abrir filtros de búsqueda"
                onPress={openSearch}
                style={styles.filterButton}
              >
                <Ionicons name="options-outline" size={16} color={tokens.color.primary} />
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
            refreshControl={
              <RefreshControl
                refreshing={eventsQuery.isRefetching && !eventsQuery.isFetchingNextPage}
                onRefresh={() => void eventsQuery.refetch()}
                tintColor={tokens.color.primary}
                colors={[tokens.color.primary]}
              />
            }
            onEndReached={() => {
              if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage)
                void eventsQuery.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item: event }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${event.title}, ${event.approximateArea}`}
                onPress={() => openEvent(event.id)}
                style={({ pressed }) => [styles.eventCard, pressed ? styles.pressed : null]}
              >
                <View
                  style={[
                    styles.eventMark,
                    { backgroundColor: categoryColor(event.category) + '22' },
                  ]}
                >
                  <Text style={[styles.eventMarkText, { color: categoryColor(event.category) }]}>
                    {event.title.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <View style={styles.categoryRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: categoryColor(event.category) },
                      ]}
                    />
                    <Text style={[styles.category, { color: categoryColor(event.category) }]}>
                      {categoryLabel(event.category).toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="heading" numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {eventDate(event.startsAt)} · {event.approximateArea}
                  </Text>
                </View>
                <View style={styles.eventCardEnd}>
                  <Text style={styles.availability}>{availabilityLabel(event)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={tokens.color.textMuted} />
                </View>
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
                  ) : (
                    <Button label="Ajustar la búsqueda" variant="secondary" onPress={openSearch} />
                  )}
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
  content: { paddingBottom: tokens.space.xxl, paddingTop: tokens.space.sm },
  fixedHeader: {
    paddingBottom: tokens.space.md,
    zIndex: 1,
  },
  hero: {
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
  },
  eyebrow: {
    color: tokens.color.burgundy,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: tokens.space.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sansExtra,
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: -1,
  },
  location: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    gap: tokens.space.xs,
    marginTop: tokens.space.md,
    minHeight: 40,
    paddingHorizontal: tokens.space.md,
    ...tokens.shadow.soft,
  },
  locationDot: { backgroundColor: tokens.color.burgundy, borderRadius: 4, height: 8, width: 8 },
  locationLabel: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 13,
  },
  radius: { color: tokens.color.textMuted, fontFamily: tokens.font.family.sans, fontSize: 13 },
  firstSearch: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.lg,
    padding: tokens.space.xl,
    ...tokens.shadow.card,
  },
  radarCard: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.lg,
    paddingVertical: tokens.space.lg,
    ...tokens.shadow.card,
  },
  radarCaption: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  radarHint: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sans,
    fontSize: 11,
    textAlign: 'center',
    marginTop: tokens.space.sm,
  },
  radar: {
    height: 196,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbGlow: {
    position: 'absolute',
    backgroundColor: tokens.color.primary,
    borderRadius: 999,
  },
  orbGlow1: { width: 96, height: 96, opacity: 0.22 },
  orbGlow2: { width: 150, height: 150, opacity: 0.12 },
  orbGlow3: { width: 196, height: 196, opacity: 0.07 },
  orbRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 999,
  },
  orbRingOuter: { width: 168, height: 168 },
  orbRingInner: { width: 104, height: 104, borderColor: 'rgba(255,255,255,0.95)' },
  orbCoreHalo: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tokens.color.primary,
    opacity: 0.2,
  },
  orbCore: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: tokens.color.primary,
  },
  blip: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    maxWidth: 138,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 6,
    position: 'absolute',
    ...tokens.shadow.soft,
  },
  blipPressed: { backgroundColor: tokens.color.primarySoft },
  blip0: { left: 0, top: 6 },
  blip1: { right: 0, top: 78 },
  blip2: { bottom: 2, left: 44 },
  blipHead: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  blipDot: { borderRadius: 3.5, height: 7, width: 7 },
  blipTitle: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 12,
    flexShrink: 1,
  },
  blipDistance: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 11,
    marginTop: 2,
  },
  timeFilters: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    gap: tokens.space.xs,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.md,
    padding: 5,
    ...tokens.shadow.soft,
  },
  timeFilter: {
    alignItems: 'center',
    borderRadius: tokens.radius.pill,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.sm,
  },
  timeFilterSelected: { backgroundColor: tokens.color.primary, ...tokens.shadow.cta },
  timeFilterText: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 12,
  },
  timeFilterTextSelected: {
    color: tokens.color.primaryText,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 12,
  },
  resultsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
  },
  eventListSurface: { flex: 1 },
  filterButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 13,
  },
  eventCard: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    gap: tokens.space.md,
    marginHorizontal: tokens.space.xl,
    marginTop: tokens.space.md,
    padding: tokens.space.md,
    ...tokens.shadow.card,
  },
  eventMark: {
    alignItems: 'center',
    backgroundColor: tokens.color.primarySoft,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  eventMarkText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansExtra,
    fontSize: 18,
  },
  eventDetails: { flex: 1, gap: 3 },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  categoryDot: { backgroundColor: tokens.color.primary, borderRadius: 4, height: 7, width: 7 },
  category: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  eventCardEnd: { alignItems: 'flex-end', gap: 4, maxWidth: 92 },
  availability: {
    color: tokens.color.textMuted,
    fontFamily: tokens.font.family.sans,
    fontSize: 11,
    textAlign: 'right',
  },
  empty: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    margin: tokens.space.xl,
    padding: tokens.space.lg,
    ...tokens.shadow.card,
  },
  loader: { margin: tokens.space.xl },
  pressed: { opacity: 0.82 },
  errorBox: { gap: tokens.space.lg, paddingHorizontal: tokens.space.xl },
  errorTitle: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
