import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from '@/ui/Text';
import { color, radius, space } from '@/ui/tokens';

type Props = TextInputProps & { label: string };

export function AuthField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={color.textMuted}
        style={[styles.input, style]}
        accessibilityLabel={label}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { fontSize: 13, fontWeight: '600', color: color.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: color.text,
    backgroundColor: color.surface,
  },
});
