import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import type { MessageKey } from '@aftervia/i18n';
import { useLocale } from '../../src/locale';
import { useOutbox } from '../../src/offline/OutboxProvider';
import { draftFromForm, type DraftForm } from '../../src/offline/draft';
import { COLORS, SPACING } from '../../src/ui/theme';

const FIELD_ERROR: Record<string, MessageKey> = {
  title: 'item.error.title',
  brand: 'item.error.brand',
  model: 'item.error.model',
  purchased_on: 'item.error.purchased_on',
  currency: 'item.error.currency',
};

// Thêm món đồ: lưu vào hàng đợi trên thiết bị, không báo đã gửi. Mỗi lần lưu tạo đúng một bản nháp.
export default function NewItemScreen() {
  const { t } = useLocale();
  const outbox = useOutbox();
  const [form, setForm] = useState<DraftForm>({ title: '', brand: '', model: '', purchasedOn: '', currency: '' });
  const [error, setError] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    if (busy || saved) return;
    const result = draftFromForm(form);
    if (!result.ok) {
      setError(FIELD_ERROR[result.field] ?? 'common.error');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await outbox.add(result.value);
      setSaved(true);
    } catch {
      setError('common.error');
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || saved;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: t('item.add') }} />
      <Text style={styles.label}>{t('item.title.label')}</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
        editable={!disabled}
        accessibilityLabel={t('item.title.label')}
      />
      <Text style={styles.label}>{t('item.brand.label')}</Text>
      <TextInput
        style={styles.input}
        value={form.brand}
        onChangeText={(value) => setForm((current) => ({ ...current, brand: value }))}
        editable={!disabled}
        accessibilityLabel={t('item.brand.label')}
      />
      <Text style={styles.label}>{t('item.model.label')}</Text>
      <TextInput
        style={styles.input}
        value={form.model}
        onChangeText={(value) => setForm((current) => ({ ...current, model: value }))}
        editable={!disabled}
        accessibilityLabel={t('item.model.label')}
      />
      <Text style={styles.label}>{t('item.purchasedOn.label')}</Text>
      <TextInput
        style={styles.input}
        value={form.purchasedOn}
        onChangeText={(value) => setForm((current) => ({ ...current, purchasedOn: value }))}
        placeholder="2026-05-02"
        editable={!disabled}
        accessibilityLabel={t('item.purchasedOn.label')}
      />
      <Text style={styles.label}>{t('item.currency.label')}</Text>
      <TextInput
        style={styles.input}
        value={form.currency}
        onChangeText={(value) => setForm((current) => ({ ...current, currency: value }))}
        placeholder="VND"
        autoCapitalize="characters"
        editable={!disabled}
        accessibilityLabel={t('item.currency.label')}
      />
      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(error)}
        </Text>
      )}
      {saved ? <Text style={styles.notice}>{t('item.draft.saved')}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => void save()}
        style={[styles.primary, disabled && styles.disabled]}
      >
        <Text style={styles.primaryText}>{t('common.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: SPACING.gutter, gap: 8, backgroundColor: COLORS.paper },
  label: { color: COLORS.inkMuted, fontSize: 14, marginTop: SPACING.gap },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.inkMuted,
    backgroundColor: COLORS.surface,
    color: COLORS.ink,
    fontSize: 16,
  },
  error: { color: COLORS.ink, fontSize: 15, marginTop: SPACING.gap },
  notice: { color: COLORS.ink, fontSize: 15, marginTop: SPACING.gap },
  primary: {
    minHeight: 44,
    marginTop: SPACING.gutter,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  disabled: { opacity: 0.5 },
  primaryText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },
});
