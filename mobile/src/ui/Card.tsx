import { StyleSheet, View, type ViewProps } from 'react-native';
import { color, radius, space } from '@/ui/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
});
