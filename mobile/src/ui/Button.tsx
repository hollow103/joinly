import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { color, minTouch, radius, space } from '@/ui/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: Props) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? color.primaryText : color.text} />
        ) : null}
        <Text
          style={[styles.label, { color: variant === 'primary' ? color.primaryText : color.text }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  primary: { backgroundColor: color.primary },
  secondary: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  disabled: { backgroundColor: color.disabled, borderColor: color.disabled },
  pressed: { opacity: 0.85 },
  content: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', fontSize: 15 },
});
