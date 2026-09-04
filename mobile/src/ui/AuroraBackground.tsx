import { StyleSheet, View } from 'react-native';
import { color } from '@/ui/tokens';

/**
 * Fondo "aurora" de la Dirección H: casi-blanco lila con cuatro manchas
 * radiales muy difusas (periwinkle, coral-burdeos, menta, lila). React Native
 * no tiene desenfoque de fondo, así que cada mancha se aproxima con dos
 * círculos concéntricos de opacidad muy baja. Se monta detrás del contenido
 * con position:absolute y pointerEvents:none.
 */
export function AuroraBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <Blob style={styles.b1} tint="#6B7CFF" />
      <Blob style={styles.b2} tint="#E4A9A0" />
      <Blob style={styles.b3} tint="#4FD6A6" />
      <Blob style={styles.b4} tint="#B98CFF" />
    </View>
  );
}

function Blob({ style, tint }: { style: object; tint: string }) {
  return (
    <View style={[styles.blob, style]}>
      <View style={[styles.blobOuter, { backgroundColor: tint }]} />
      <View style={[styles.blobInner, { backgroundColor: tint }]} />
    </View>
  );
}

const SIZE = 460;

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobOuter: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    opacity: 0.1,
  },
  blobInner: {
    position: 'absolute',
    width: SIZE * 0.6,
    height: SIZE * 0.6,
    borderRadius: SIZE * 0.3,
    opacity: 0.14,
  },
  b1: { top: -230, left: -200 },
  b2: { top: -120, right: -230 },
  b3: { bottom: -240, left: -180 },
  b4: { bottom: -160, right: -220 },
});
