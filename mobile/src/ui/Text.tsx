import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { color, font } from '@/ui/tokens';

export type TextVariant = 'body' | 'muted' | 'caption' | 'heading' | 'title' | 'display';

type Props = TextProps & { variant?: TextVariant };

/**
 * Tipografía de la Dirección H: todo Manrope. La jerarquía la lleva el tamaño
 * y el peso (800 en titulares, 500/400 en cuerpo), no el color.
 */
export function Text({ variant = 'body', style, ...rest }: Props) {
  return <RNText style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontFamily: font.family.sans, fontSize: font.size.md, color: color.text, lineHeight: 22 },
  muted: {
    fontFamily: font.family.sans,
    fontSize: font.size.md,
    color: color.textMuted,
    lineHeight: 22,
  },
  caption: { fontFamily: font.family.sansMedium, fontSize: font.size.sm, color: color.textMuted },
  heading: {
    fontFamily: font.family.sansBold,
    fontSize: font.size.lg,
    color: color.text,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: font.family.sansExtra,
    fontSize: font.size.xl,
    color: color.text,
    letterSpacing: -0.6,
  },
  display: {
    fontFamily: font.family.sansExtra,
    fontSize: font.size.xxl,
    color: color.text,
    lineHeight: 34,
    letterSpacing: -1,
  },
});
