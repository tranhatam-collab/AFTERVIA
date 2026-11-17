import { Tabs } from 'expo-router';
import { useLocale } from '../../src/locale';
import { COLORS } from '../../src/ui/theme';

// Bốn tab của ứng dụng. Màn Case và Nhắc việc chưa có dữ liệu trong bản này.
export default function TabsLayout() {
  const { t } = useLocale();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: COLORS.primary }}>
      <Tabs.Screen name="index" options={{ title: t('nav.items') }} />
      <Tabs.Screen name="cases" options={{ title: t('nav.cases') }} />
      <Tabs.Screen name="reminders" options={{ title: t('nav.reminders') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings') }} />
    </Tabs>
  );
}
