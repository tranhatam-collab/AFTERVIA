import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { MessageKey } from '@aftervia/i18n';
import { useLocale } from '../../src/locale';
import { useOutbox } from '../../src/offline/OutboxProvider';
import type { OutboxStatus } from '../../src/offline/outbox';
import { COLORS, SPACING } from '../../src/ui/theme';

const STATUS_KEY: Record<OutboxStatus, MessageKey> = {
  pending: 'outbox.pending',
  syncing: 'outbox.syncing',
  synced: 'outbox.synced',
  uncertain: 'outbox.uncertain',
  rejected: 'outbox.rejected',
  cancelled: 'outbox.cancelled',
};

// Màn Món đồ: bản nháp luôn hiện trạng thái rõ ràng. Chỉ hiện "đã đồng bộ" khi máy chủ đã xác nhận.
export default function ItemsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const outbox = useOutbox();
  const shown = [...outbox.entries].reverse();

  return (
    <View style={styles.page}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/items/new')} style={styles.primary}>
          <Text style={styles.primaryText}>{t('item.add')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void outbox.resume()} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('outbox.resume')}</Text>
        </Pressable>
      </View>
      {outbox.status === 'error' ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {t('common.error')}
        </Text>
      ) : null}
      {outbox.status === 'loading' ? <Text style={styles.text}>{t('common.loading')}</Text> : null}
      {outbox.status === 'ready' && shown.length === 0 ? <Text style={styles.text}>{t('common.empty')}</Text> : null}
      <FlatList
        data={shown}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: entry }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{entry.draft.title}</Text>
            <Text style={styles.status}>{t(STATUS_KEY[entry.status])}</Text>
            {entry.status === 'pending' || entry.status === 'rejected' ? (
              <Pressable accessibilityRole="button" onPress={() => void outbox.cancel(entry.id)} style={styles.link}>
                <Text style={styles.linkText}>{t('outbox.cancel')}</Text>
              </Pressable>
            ) : null}
            {entry.status === 'uncertain' ? (
              <Pressable accessibilityRole="button" onPress={() => void outbox.confirmRetry(entry.id)} style={styles.link}>
                <Text style={styles.linkText}>{t('outbox.confirmRetry')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: SPACING.gutter, backgroundColor: COLORS.paper },
  actions: { flexDirection: 'row', gap: SPACING.gap, flexWrap: 'wrap' },
  primary: {
    minHeight: 44,
    paddingHorizontal: SPACING.gutter,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  primaryText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },
  secondary: {
    minHeight: 44,
    paddingHorizontal: SPACING.gutter,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  text: { color: COLORS.ink, fontSize: 16, marginTop: SPACING.gap },
  list: { paddingTop: SPACING.gutter, gap: SPACING.gap },
  card: { padding: SPACING.gutter, borderRadius: 12, backgroundColor: COLORS.surface, gap: 6 },
  title: { color: COLORS.ink, fontSize: 16, fontWeight: '600' },
  status: { color: COLORS.inkMuted, fontSize: 14 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
