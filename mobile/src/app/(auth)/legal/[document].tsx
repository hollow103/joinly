import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { legalDocuments, type LegalDocumentId } from '@/legal/documents';
import { Button, Screen, Text, tokens } from '@/ui';

export default function LegalDocument() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document: string }>();
  const content = legalDocuments[document as LegalDocumentId];

  if (!content) {
    return (
      <Screen>
        <Button label="Volver" onPress={router.back} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">{content.title}</Text>
        {content.paragraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        <Text style={styles.notice}>Borrador v1 pendiente de publicación y revisión jurídica.</Text>
        <Button label="Volver al registro" onPress={router.back} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: tokens.space.lg },
  content: { gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  paragraph: { color: tokens.color.text, fontSize: 15, lineHeight: 23 },
  notice: { color: tokens.color.danger, fontSize: 13, lineHeight: 19 },
});
