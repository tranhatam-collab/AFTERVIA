import { StyleSheet, Text, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { COLORS, SPACING } from '../../src/ui/theme';

// Màn Case: chưa có dữ liệu trong bản shell này. Không giả vờ có case.
export default function CasesScreen() {
  const { t } = useLocale();
  return (
    <View style={styles.page}>
      <Text style={styles.text}>{t('common.empty')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: SPACING.gutter, backgroundColor: COLORS.paper },
  text: { color: COLORS.ink, fontSize: 16 },
});
