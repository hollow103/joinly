import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { color, font } from '@/ui/tokens';

export type TextVariant = 'body' | 'muted' | 'caption' | 'heading' | 'title';

type Props = TextProps & { variant?: TextVariant };

export function Text({ variant = 'body', style, ...rest }: Props) {
  return <RNText style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontSize: font.size.md, color: color.text },
  muted: { fontSize: font.size.md, color: color.textMuted },
  caption: { fontSize: font.size.sm, color: color.textMuted },
  heading: { fontSize: font.size.lg, color: color.text, fontWeight: '600' },
  title: { fontSize: font.size.xl, color: color.text, fontWeight: '700' },
});
