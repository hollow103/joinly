import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { color, space } from '@/ui/tokens';

type Props = ViewProps & { edges?: readonly Edge[] };

export function Screen({ style, children, edges = ['top', 'bottom'], ...rest }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.content, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.surface },
  content: { flex: 1, padding: space.lg, gap: space.lg },
});
