import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { legalDocuments } from '@/legal/documents';
import { Screen, Text, tokens } from '@/ui';

export default function Guidelines() {
  const router = useRouter();
  const content = legalDocuments.guidelines;

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={router.back}
          style={styles.back}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text variant="title">{content.title}</Text>
        {content.paragraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        <Text style={styles.notice}>Borrador v1 pendiente de publicación y revisión jurídica.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  paragraph: { color: tokens.color.text, fontSize: 15, lineHeight: 23 },
  notice: { color: tokens.color.danger, fontSize: 13, lineHeight: 19 },
});
