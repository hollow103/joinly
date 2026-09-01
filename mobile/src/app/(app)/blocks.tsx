import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { deleteBlock, getBlocks, type BlockedUser } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { Button, Screen, Text, tokens } from '@/ui';

export default function Blocks() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSession((state) => state.token);

  const query = useInfiniteQuery({
    queryKey: ['blocks'],
    queryFn: ({ pageParam }) => getBlocks(token, { cursor: pageParam, limit: 50 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.data.page.nextCursor,
    enabled: Boolean(token),
  });

  const unblock = useMutation({
    mutationFn: (blockedUserId: string) => deleteBlock(token, blockedUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['blocks'] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'search'] });
    },
  });

  const items = query.data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <Screen backgroundColor={tokens.color.bg} edges={['top', 'bottom']} style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.user.id}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={router.back}
              style={styles.back}
            >
              <Text style={styles.backText}>Volver</Text>
            </Pressable>
            <Text variant="title">Personas bloqueadas</Text>
            <Text variant="muted">
              Los bloqueos son recíprocos: no veréis los planes ni podréis uniros a los del otro.
            </Text>
          </View>
        }
        renderItem={({ item }: { item: BlockedUser }) => (
          <View style={styles.row}>
            <Text style={styles.alias}>{item.user.alias}</Text>
            <View style={styles.action}>
              <Button
                label="Desbloquear"
                variant="secondary"
                loading={unblock.isPending && unblock.variables === item.user.id}
                onPress={() => unblock.mutate(item.user.id)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={tokens.color.primary} style={styles.loader} />
          ) : (
            <Text variant="muted" style={styles.empty}>
              No has bloqueado a nadie.
            </Text>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { paddingBottom: tokens.space.xxl },
  header: { gap: tokens.space.sm, padding: tokens.space.lg },
  back: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  backText: { color: tokens.color.primary, fontSize: 14, fontWeight: '700' },
  row: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    gap: tokens.space.md,
    marginHorizontal: tokens.space.lg,
    marginTop: tokens.space.md,
    padding: tokens.space.md,
  },
  alias: { color: tokens.color.text, flex: 1, fontSize: 15, fontWeight: '600' },
  action: { width: 150 },
  loader: { margin: tokens.space.xl },
  empty: { marginHorizontal: tokens.space.lg },
});
