import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { createReport, type ReportInput } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { Button, Screen, Text, tokens } from '@/ui';

type ReportReason = ReportInput['reason'];

const reasons: readonly { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'inappropriateContent',
    label: 'Contenido inapropiado',
    description: 'Incluye contenido ofensivo, sexual o que no encaja en Joinly.',
  },
  {
    value: 'abusiveBehavior',
    label: 'Comportamiento abusivo',
    description: 'Amenazas, acoso o una conducta que hace sentir inseguridad.',
  },
  {
    value: 'fraudulentEvent',
    label: 'Plan fraudulento',
    description: 'Parece engañoso o usa Joinly con una finalidad no permitida.',
  },
  {
    value: 'misleadingLocation',
    label: 'Ubicación engañosa',
    description: 'La zona o ubicación del plan parece incorrecta o engañosa.',
  },
  { value: 'other', label: 'Otro motivo', description: 'Cuéntanos qué ha ocurrido.' },
];

export default function NewReportScreen() {
  const router = useRouter();
  const { targetId, targetName, targetType } = useLocalSearchParams<{
    targetId: string;
    targetName: string;
    targetType: 'event' | 'user';
  }>();
  const token = useSession((state) => state.token);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reportMutation = useMutation({
    mutationFn: () =>
      createReport(token, {
        targetType,
        targetId,
        reason: reason!,
        ...(description.trim() ? { description: description.trim() } : {}),
      }),
    onSuccess: () => setSubmitted(true),
    onError: () =>
      setError('No pudimos enviar el reporte. Comprueba tu conexión e inténtalo de nuevo.'),
  });

  function submit() {
    if (!reason) {
      setError('Elige un motivo para continuar.');
      return;
    }
    setError(null);
    reportMutation.mutate();
  }

  if (!targetId || (targetType !== 'event' && targetType !== 'user')) {
    return (
      <Screen style={styles.center}>
        <Text variant="heading">No se puede preparar este reporte</Text>
        <Button label="Volver" onPress={router.back} />
      </Screen>
    );
  }

  if (submitted) {
    return (
      <Screen style={styles.center}>
        <View style={styles.success}>
          <Text variant="heading">Reporte enviado</Text>
          <Text variant="muted">
            Gracias por avisarnos. Lo revisaremos de forma privada y no compartiremos tu identidad
            con la persona reportada.
          </Text>
        </View>
        <Button label="Volver al plan" onPress={router.back} />
      </Screen>
    );
  }

  const targetLabel = targetType === 'event' ? 'el plan' : 'la persona';

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la ficha del plan"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>REPORTE PRIVADO</Text>
          <Text style={styles.title}>Reportar {targetLabel}</Text>
          <Text style={styles.target} numberOfLines={2}>
            {targetName}
          </Text>
          <Text style={styles.helper}>
            Elige el motivo que mejor describa la situación. La revisión la realiza el equipo de
            moderación.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="heading">Motivo</Text>
          {reasons.map((item) => {
            const selected = item.value === reason;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                accessibilityHint={item.description}
                onPress={() => {
                  setReason(item.value);
                  setError(null);
                }}
                style={[styles.reason, selected ? styles.reasonSelected : null]}
              >
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.reasonText}>
                  <Text style={styles.reasonLabel}>{item.label}</Text>
                  <Text style={styles.reasonDescription}>{item.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text variant="heading">Añade contexto (opcional)</Text>
          <Text style={styles.inputHelp}>
            No incluyas datos de contacto ni detalles que no sean necesarios para revisar el caso.
          </Text>
          <TextInput
            accessibilityLabel="Descripción opcional del reporte"
            accessibilityHint="Explica brevemente qué ha ocurrido"
            value={description}
            onChangeText={setDescription}
            placeholder="Explica brevemente qué ha ocurrido"
            placeholderTextColor={tokens.color.textMuted}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={styles.description}
          />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button
          label="Enviar reporte"
          loading={reportMutation.isPending}
          disabled={!reason}
          accessibilityHint="Envía el reporte al equipo de moderación"
          onPress={submit}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  center: { alignItems: 'center', justifyContent: 'center' },
  back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
  backText: { color: tokens.color.primary, fontFamily: tokens.font.family.sansSemibold, fontSize: 14 },
  hero: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.sm,
    padding: tokens.space.xl,
  },
  eyebrow: {
    color: tokens.color.primary,
    fontFamily: tokens.font.family.sansSemibold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: tokens.color.text,
    fontFamily: tokens.font.family.serifSemibold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.4,
  },
  target: { color: tokens.color.text, fontFamily: tokens.font.family.sansSemibold, fontSize: 15 },
  helper: { color: tokens.color.textMuted, fontFamily: tokens.font.family.sans, fontSize: 14, lineHeight: 20 },
  section: { gap: tokens.space.sm },
  reason: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: tokens.space.md,
    minHeight: 72,
    padding: tokens.space.md,
  },
  reasonSelected: { backgroundColor: tokens.color.primarySoft, borderColor: tokens.color.primary },
  radio: {
    alignItems: 'center',
    borderColor: tokens.color.textMuted,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  radioSelected: { borderColor: tokens.color.primary },
  radioDot: { backgroundColor: tokens.color.primary, borderRadius: 6, height: 12, width: 12 },
  reasonText: { flex: 1, gap: 2 },
  reasonLabel: { color: tokens.color.text, fontSize: 15, fontWeight: '700' },
  reasonDescription: { color: tokens.color.textMuted, fontSize: 13, lineHeight: 18 },
  inputHelp: { color: tokens.color.textMuted, fontSize: 13, lineHeight: 18 },
  description: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    color: tokens.color.text,
    minHeight: 128,
    padding: tokens.space.md,
  },
  error: { color: tokens.color.danger, fontSize: 14, lineHeight: 20 },
  success: {
    backgroundColor: tokens.color.successSoft,
    borderRadius: tokens.radius.md,
    gap: tokens.space.sm,
    padding: tokens.space.xl,
  },
});
