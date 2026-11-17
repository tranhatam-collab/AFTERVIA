import { StyleSheet, Text, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { COLORS, SPACING } from '../../src/ui/theme';

// Màn Nhắc việc: chưa có nhắc việc nào được tải trong bản shell này.
export default function RemindersScreen() {
  const { t } = useLocale();
  return (
    <View style={styles.page}>
      <Text style={styles.text}>{t('reminder.inbox.empty')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: SPACING.gutter, backgroundColor: COLORS.paper },
  text: { color: COLORS.ink, fontSize: 16 },
});
