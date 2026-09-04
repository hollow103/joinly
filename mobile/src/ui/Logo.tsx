import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '@/ui/tokens';

type Props = {
  /** Alto tipográfico del wordmark en dp. Por defecto 22. */
  size?: number;
  /** Color de la palabra. El punto es siempre burdeos. Por defecto tinta. */
  tone?: string;
  /** Mostrar la marca de icono (orbe radar) antes del wordmark. Por defecto, sí. */
  showMark?: boolean;
};

/**
 * Identidad de joinly — Dirección H "Aurora / cristal".
 * Marca de icono: un orbe radar (resplandor periwinkle + dos anillos
 * concéntricos + punto central), el "estás aquí".
 * Wordmark: "joinly" en Manrope ExtraBold, minúsculas, con un punto burdeos
 * elevado sobre la "y" — el segundo tono cálido de la marca.
 */
export function Logo({ size = 22, tone = color.text, showMark = true }: Props) {
  const dot = Math.max(4, Math.round(size * 0.16));
  const mark = Math.round(size * 1.5);
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="joinly">
      {showMark ? <OrbMark size={mark} /> : null}
      <Text allowFontScaling={false} style={[styles.word, { fontSize: size, color: tone }]}>
        joinly
      </Text>
      <View
        style={[
          styles.dot,
          { width: dot, height: dot, borderRadius: dot, marginBottom: size * 0.52 },
        ]}
      />
    </View>
  );
}

/** Orbe radar construido con Views: resplandor + anillos + núcleo. */
export function OrbMark({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.glow,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color.primary },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: (size * 0.82) / 2,
            borderColor: 'rgba(255,255,255,0.85)',
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: (size * 0.5) / 2,
            borderColor: 'rgba(255,255,255,0.95)',
          },
        ]}
      />
      <View
        style={{
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: (size * 0.2) / 2,
          backgroundColor: color.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  orb: { alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 1 },
  glow: { position: 'absolute', opacity: 0.28 },
  ring: { position: 'absolute', borderWidth: 1.5 },
  word: { fontFamily: font.family.sansExtra, letterSpacing: -0.6 },
  dot: { backgroundColor: color.burgundy, marginLeft: 2 },
});
