import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Locale } from '@aftervia/i18n';
import { useLocale } from '../../src/locale';
import { COLORS, SPACING } from '../../src/ui/theme';

const CHOICES: readonly Locale[] = ['vi', 'en'];

// Cài đặt: chọn ngôn ngữ và lối vào màn Quyền riêng tư (xuất, chia sẻ, xóa tài khoản — WO11-03).
export default function SettingsScreen() {
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  return (
    <View style={styles.page}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {CHOICES.map((choice) => {
          const selected = choice === locale;
          return (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setLocale(choice)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {choice === 'vi' ? t('locale.vi') : t('locale.en')}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/privacy')} style={styles.link}>
        <Text style={styles.linkText}>{t('privacy.heading')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: SPACING.gutter, gap: SPACING.gap, backgroundColor: COLORS.paper },
  label: { color: COLORS.inkMuted, fontSize: 14 },
  row: { flexDirection: 'row', gap: SPACING.gap },
  choice: {
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: SPACING.gutter,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  choiceSelected: { backgroundColor: COLORS.primary },
  choiceText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  link: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    paddingTop: SPACING.gap,
  },
  linkText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  choiceTextSelected: { color: COLORS.onPrimary },
});
