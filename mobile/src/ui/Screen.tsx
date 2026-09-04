import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { AuroraBackground } from '@/ui/AuroraBackground';
import { color, space } from '@/ui/tokens';

type Props = ViewProps & {
  edges?: readonly Edge[];
  backgroundColor?: string;
  /** Fondo aurora detrás del contenido (Dirección H). Por defecto, activado. */
  aurora?: boolean;
};

export function Screen({
  style,
  children,
  edges = ['top', 'bottom'],
  backgroundColor,
  aurora = true,
  ...rest
}: Props) {
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: backgroundColor ?? color.bg }]}
      edges={edges}
    >
      {aurora ? <AuroraBackground /> : null}
      <View style={[styles.content, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: space.lg, gap: space.lg },
});
