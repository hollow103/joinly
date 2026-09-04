import { StyleSheet, View, type ViewProps } from 'react-native';
import { color, radius, shadow, space } from '@/ui/tokens';

/**
 * Tarjeta de cristal (Dirección H): blanco translúcido, filo claro de 1 dp y
 * sombra difusa multicapa. Sin borde marcado: lo que la separa del fondo es la
 * elevación, no una línea. Radio amplio.
 */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.glassBorder,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
});
