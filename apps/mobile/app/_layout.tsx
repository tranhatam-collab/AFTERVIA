import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LocaleProvider } from '../src/locale';
import { OutboxProvider } from '../src/offline/OutboxProvider';

export default function RootLayout() {
  return (
    <LocaleProvider>
      <OutboxProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="items/new" options={{ headerShown: true, presentation: 'modal' }} />
        </Stack>
      </OutboxProvider>
    </LocaleProvider>
  );
}
