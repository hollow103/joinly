import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getEvent } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { availabilityLabel, categoryLabel, distanceLabel, eventDate } from '@/events/discovery';
import { Button, Screen, Text, tokens } from '@/ui';

export default function EventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((state) => state.token);
  const eventQuery = useQuery({
    queryKey: ['events', id],
    queryFn: () => getEvent(token, id),
    enabled: Boolean(id && token),
  });
  const event = eventQuery.data?.data;

  if (eventQuery.isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen style={styles.center}>
        <Text variant="heading">Este plan ya no está disponible</Text>
        <Button label="Volver al radar" onPress={router.back} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="Volver al radar"
          accessibilityRole="button"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver al radar</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.category}>{categoryLabel(event.category).toUpperCase()}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.heroDescription}>{event.description}</Text>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.meta}>{eventDate(event.startsAt)}</Text>
          <Text style={styles.meta}>{event.approximateArea}</Text>
          {event.distanceMeters !== undefined ? (
            <Text style={styles.meta}>{distanceLabel(event.distanceMeters)}</Text>
          ) : null}
          <Text style={styles.meta}>{availabilityLabel(event)}</Text>
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            La ubicación exacta se mostrará solo cuando tu participación esté confirmada.
          </Text>
        </View>
        {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
        <View style={styles.creator}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{event.creator.alias.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text variant="heading">Creado por {event.creator.alias}</Text>
            <Text variant="caption">Alias visible; sin datos de contacto</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  center: { alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  hero: {
    backgroundColor: tokens.color.brandNavy,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.xl,
  },
  category: { color: '#B8C7FF', fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: tokens.color.primaryText, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heroDescription: { color: '#D5DEFA', fontSize: 16, lineHeight: 23 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  meta: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    color: tokens.color.text,
    fontSize: 13,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  notice: {
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
  },
  noticeText: { color: tokens.color.brandNavy, fontSize: 14, lineHeight: 20 },
  notes: { color: tokens.color.text, fontSize: 15, lineHeight: 23 },
  creator: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    gap: tokens.space.md,
    padding: tokens.space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: tokens.color.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: tokens.color.primary, fontSize: 18, fontWeight: '700' },
});
