import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/ui/Text';
import { color, font, minTouch, radius, shadow, space } from '@/ui/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

/**
 * Botón de la Dirección H. Primario: píldora con degradado periwinkle, brillo
 * de color y un gesto de "clic físico" (se hunde en su sombra al pulsar).
 * Secundario: cristal con borde y texto periwinkle. Texto: enlace sin fondo.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: Props) {
  const isDisabled = Boolean(disabled || loading);
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primaryWrap : variant === 'secondary' ? styles.secondary : styles.text,
        isPrimary && !isDisabled && (pressed ? shadow.ctaSunk : shadow.cta),
        isPrimary && pressed && !isDisabled && styles.sunk,
        isDisabled && styles.disabled,
        !isPrimary && pressed && !isDisabled && styles.pressed,
      ]}
    >
      {isPrimary && !isDisabled ? (
        <LinearGradient
          colors={[color.primaryGradTop, color.primaryGradBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? color.primaryText : color.primary} />
        ) : null}
        <Text style={[styles.label, { color: isPrimary ? color.primaryText : color.primary }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryWrap: { backgroundColor: color.primaryGradBottom },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.primary,
    ...shadow.soft,
  },
  text: { backgroundColor: 'transparent', paddingHorizontal: space.md, minHeight: 44 },
  sunk: { transform: [{ translateY: 1 }] },
  disabled: { backgroundColor: color.disabled, borderColor: color.disabled },
  pressed: { opacity: 0.9 },
  content: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: font.family.sansBold, fontSize: 15, letterSpacing: 0.1 },
});
