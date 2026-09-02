import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createEvent, type EventInput } from '@/api/endpoints';
import { ApiError } from '@/api/problem';
import { AuthField } from '@/auth/AuthField';
import { useSession } from '@/auth/session';
import { useEventSearch } from '@/events/search-store';
import { locationErrorMessage, readCurrentLocation } from '@/lib/location';
import {
  accessModeOptions,
  categoryOptions,
  durationOptions,
  validateEventForm,
  type AccessMode,
  type EventFormErrors,
} from '@/events/form';
import { Button, DateTimeField, Screen, Text, tokens } from '@/ui';

export default function NewEvent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSession((state) => state.token);
  const origin = useEventSearch((state) => state.origin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [accessMode, setAccessMode] = useState<AccessMode>('direct');
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    origin ? { latitude: origin.latitude, longitude: origin.longitude } : null,
  );
  const [locationLabel, setLocationLabel] = useState<string | null>(origin?.label ?? null);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const values = useMemo(
    () => ({
      title,
      description,
      notes,
      category,
      startsAt,
      durationMinutes,
      accessMode,
      unlimitedCapacity,
      capacity,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      locationLabel,
    }),
    [
      title,
      description,
      notes,
      category,
      startsAt,
      durationMinutes,
      accessMode,
      unlimitedCapacity,
      capacity,
      coords,
      locationLabel,
    ],
  );

  const mutation = useMutation({
    mutationFn: () => {
      const parsedCapacity = unlimitedCapacity ? undefined : Number(capacity);
      return createEvent(token, {
        title: title.trim(),
        description: description.trim(),
        notes: notes.trim() ? notes.trim() : undefined,
        category: category as EventInput['category'],
        startsAt: startsAt!.toISOString(),
        durationMinutes,
        exactLocation: {
          type: 'Point',
          coordinates: [coords!.longitude, coords!.latitude],
        },
        accessMode,
        capacity: parsedCapacity,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
      router.replace('/plans');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'active_event_limit_reached') {
          setFormError('Ya tienes tres planes activos. Cancela o cierra uno antes de crear otro.');
          return;
        }
        if (error.fields) {
          setErrors((current) => ({ ...current, ...mapFieldErrors(error.fields!) }));
          setFormError('Revisa los campos marcados.');
          return;
        }
      }
      setFormError('No se pudo publicar el plan. Inténtalo de nuevo.');
    },
  });

  async function useCurrentLocation() {
    setIsLocating(true);
    try {
      const coords = await readCurrentLocation();
      setCoords(coords);
      setLocationLabel('Ubicación actual');
      setErrors((current) => ({ ...current, location: undefined }));
    } catch (error) {
      setErrors((current) => ({ ...current, location: locationErrorMessage(error) }));
    } finally {
      setIsLocating(false);
    }
  }

  function submit() {
    setFormError(null);
    const nextErrors = validateEventForm(values, new Date());
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setFormError('Revisa los campos marcados.');
      return;
    }
    mutation.mutate();
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text variant="title">Crea un plan</Text>
        <Text variant="muted">
          La ubicación exacta se envía para publicar, pero quien vea el plan solo verá la zona
          aproximada hasta confirmar su plaza.
        </Text>

        <View style={styles.card}>
          <Text variant="heading">1 · Qué y cuándo</Text>
          <AuthField
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Ruta en bici por el río"
          />
          {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

          <Text style={styles.groupLabel}>Categoría</Text>
          <View style={styles.chips}>
            {categoryOptions.map(([value, label]) => {
              const selected = value === category;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(value)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={selected ? styles.chipSelectedText : styles.chipText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : null}

          <AuthField
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            placeholder="Cuenta en qué consiste el plan"
            multiline
            style={styles.multiline}
          />
          {errors.description ? <Text style={styles.fieldError}>{errors.description}</Text> : null}

          <DateTimeField
            label="Fecha y hora"
            value={startsAt}
            onChange={setStartsAt}
            minimumDate={new Date()}
          />
          {errors.startsAt ? <Text style={styles.fieldError}>{errors.startsAt}</Text> : null}

          <Text style={styles.groupLabel}>Duración</Text>
          <View style={styles.chips}>
            {durationOptions.map(([value, label]) => {
              const selected = value === durationMinutes;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setDurationMinutes(value)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={selected ? styles.chipSelectedText : styles.chipText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text variant="heading">2 · Dónde y quién</Text>
          <Text variant="muted">
            {locationLabel
              ? `Ubicación fijada: ${locationLabel}`
              : 'Marca dónde es el plan. Se necesita para publicar.'}
          </Text>
          <Button
            label={locationLabel ? 'Actualizar ubicación' : 'Usar mi ubicación actual'}
            variant="secondary"
            loading={isLocating}
            onPress={useCurrentLocation}
          />
          {errors.location ? <Text style={styles.fieldError}>{errors.location}</Text> : null}

          <Text style={styles.groupLabel}>Aforo</Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: unlimitedCapacity }}
            onPress={() => setUnlimitedCapacity((value) => !value)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, unlimitedCapacity ? styles.checkboxOn : null]}>
              {unlimitedCapacity ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>Sin límite de plazas</Text>
          </Pressable>
          {!unlimitedCapacity ? (
            <AuthField
              label="Número de plazas"
              value={capacity}
              onChangeText={setCapacity}
              placeholder="Ej. 8"
              keyboardType="number-pad"
            />
          ) : null}

          <Text style={styles.groupLabel}>Acceso</Text>
          {accessModeOptions.map(([value, label, hint]) => {
            const selected = value === accessMode;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setAccessMode(value)}
                style={[styles.option, selected ? styles.optionSelected : null]}
              >
                <Text style={styles.optionTitle}>{label}</Text>
                <Text style={styles.optionHint}>{hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text variant="heading">3 · Observaciones</Text>
          <AuthField
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Punto de encuentro, material necesario…"
            multiline
            style={styles.multiline}
          />
          {formError ? (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {formError}
            </Text>
          ) : null}
          <Button label="Publicar plan" loading={mutation.isPending} onPress={submit} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function mapFieldErrors(fields: Record<string, string>): EventFormErrors {
  const next: EventFormErrors = {};
  for (const [key, message] of Object.entries(fields)) {
    if (key === 'title' || key === 'description' || key === 'category') next[key] = message;
    else if (key === 'startsAt' || key === 'durationMinutes') next.startsAt = message;
    else if (key === 'exactLocation') next.location = message;
  }
  return next;
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
  groupLabel: {
    color: tokens.color.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: tokens.space.xs,
  },
  multiline: { minHeight: 88, paddingTop: tokens.space.sm, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
  },
  chipSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  chipText: { color: tokens.color.text, fontSize: 13, fontWeight: '600' },
  chipSelectedText: { color: tokens.color.primary, fontSize: 13, fontWeight: '700' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm, minHeight: 48 },
  checkbox: {
    alignItems: 'center',
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.sm,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxOn: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  checkmark: { color: tokens.color.primaryText, fontSize: 14, fontWeight: '700' },
  checkLabel: { color: tokens.color.text, fontSize: 14 },
  option: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 2,
    padding: tokens.space.md,
  },
  optionSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  optionTitle: { color: tokens.color.text, fontSize: 14, fontWeight: '700' },
  optionHint: { color: tokens.color.textMuted, fontSize: 12, lineHeight: 17 },
  fieldError: { color: tokens.color.danger, fontSize: 13, lineHeight: 18 },
});
