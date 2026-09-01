import * as Location from 'expo-location';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { categoryOptions } from '@/events/discovery';
import { useEventSearch } from '@/events/search-store';
import { Button, Screen, Text, tokens } from '@/ui';

const radii = [3000, 5000, 10000];

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
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setIsLocating(false);
      setErrorMessage(
        'Necesitamos tu permiso para buscar planes cerca de ti. No guardaremos tu ubicación.',
      );
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setOrigin({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: 'Ubicación actual',
      });
      router.replace('/home');
    } catch {
      setErrorMessage(
        'No pudimos obtener tu ubicación. Comprueba que la ubicación del dispositivo esté activa.',
      );
    } finally {
      setIsLocating(false);
    }
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
          <Text variant="heading">¿Qué te interesa?</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.md,
    padding: tokens.space.lg,
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
  },
  choiceSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  choiceText: { color: tokens.color.text, fontWeight: '600' },
  choiceSelectedText: { color: tokens.color.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
  },
  chipSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  chipText: { color: tokens.color.text, fontSize: 13, fontWeight: '600' },
  chipSelectedText: { color: tokens.color.primary, fontSize: 13, fontWeight: '700' },
  error: { color: tokens.color.danger, fontSize: 13, lineHeight: 19 },
});
