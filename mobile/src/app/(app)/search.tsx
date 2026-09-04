import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { categoryOptions } from '@/events/discovery';
import { useEventSearch } from '@/events/search-store';
import { locationErrorMessage, readCurrentLocation } from '@/lib/location';
import { Button, Screen, Text, tokens } from '@/ui';

const radii = [3000, 10000, 25000, 50000];

export default function Search() {
  const router = useRouter();
  const radiusMeters = useEventSearch((state) => state.radiusMeters);
  const categories = useEventSearch((state) => state.categories);
  const setOrigin = useEventSearch((state) => state.setOrigin);
  const setRadiusMeters = useEventSearch((state) => state.setRadiusMeters);
  const toggleCategory = useEventSearch((state) => state.toggleCategory);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  async function useCurrentLocation() {
    setErrorMessage(null);
    setIsLocating(true);
    try {
      const coords = await readCurrentLocation();
      setOrigin({ ...coords, label: 'Ubicación actual' });
      router.replace('/home');
    } catch (error) {
      setErrorMessage(locationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="Volver al radar"
          accessibilityRole="button"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver al radar</Text>
        </Pressable>
        <Text variant="title">Busca a tu manera</Text>
        <Text variant="muted">
          Tu ubicación se usa solo para esta búsqueda y no se guarda como historial.
        </Text>

        <View style={styles.card}>
          <Text variant="heading">¿Desde dónde?</Text>
          <Text variant="muted">
            Usaremos tu ubicación actual únicamente para encontrar planes cercanos.
          </Text>
          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          <Button
            label="Usar mi ubicación actual"
            loading={isLocating}
            onPress={useCurrentLocation}
          />
        </View>

        <View style={styles.card}>
          <Text variant="heading">Radio de búsqueda</Text>
          <View style={styles.choiceRow}>
            {radii.map((radius) => (
              <Pressable
                key={radius}
                accessibilityRole="button"
                accessibilityState={{ selected: radius === radiusMeters }}
                onPress={() => setRadiusMeters(radius)}
                style={[styles.choice, radius === radiusMeters ? styles.choiceSelected : null]}
              >
                <Text
                  style={radius === radiusMeters ? styles.choiceSelectedText : styles.choiceText}
                >
                  {radius / 1000} km
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text variant="heading">¿Qué te interesa?</Text>
            {categories.length > 0 ? (
              <Text style={styles.count}>{categories.length} seleccionadas</Text>
            ) : (
              <Text variant="caption">Todas</Text>
            )}
          </View>
          <View style={styles.chips}>
            {categoryOptions.map(([value, label]) => {
              const selected = categories.includes(value);
              return (
                <Pressable
                  key={value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleCategory(value)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={selected ? styles.chipSelectedText : styles.chipText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {isLocating ? <ActivityIndicator color={tokens.color.primary} /> : null}
      </ScrollView>

      <View style={styles.applyBar}>
        <Button label="Ver planes" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, gap: 0 },
  scroll: { flex: 1 },
  content: {
    gap: tokens.space.lg,
    padding: tokens.space.lg,
    paddingBottom: tokens.space.xxl,
  },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 14,
  },
  card: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.lg,
    ...tokens.shadow.card,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  count: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 12,
  },
  choiceRow: { flexDirection: 'row', gap: tokens.space.sm },
  choice: {
    alignItems: 'center',
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 2,
  },
  choiceSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  choiceText: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sansMedium,
    fontSize: 13,
  },
  choiceSelectedText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 13,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
  },
  chipSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  chipText: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.sansMedium,
    fontSize: 13,
  },
  chipSelectedText: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 13,
  },
  error: {
    color: tokens.color.danger,
    fontFamily: tokens.font.family.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  applyBar: {
    backgroundColor: tokens.color.surfaceSolid,
    borderTopColor: tokens.color.glassBorder,
    borderTopWidth: 1,
    padding: tokens.space.lg,
    ...tokens.shadow.nav,
  },
});
