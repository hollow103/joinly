import { StyleSheet, View } from 'react-native';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/tokens';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      {description ? (
        <Text variant="muted" style={styles.center}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  center: { textAlign: 'center' },
});
