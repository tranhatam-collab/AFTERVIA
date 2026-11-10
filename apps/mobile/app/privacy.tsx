// Màn Quyền riêng tư của bản di động (WO11-03): xuất, chia sẻ, xóa tài khoản.
//
// Bản di động chưa có đăng nhập (SESSION_TOKEN là null, WO10-02). Thao tác xóa đòi một phiên vừa được
// cấp trong 5 phút, nên ở bản này màn hình nói thẳng là chưa gửi được thay vì để một nút bấm vào không
// có tác dụng. Khi đăng nhập có thật, chỉ cần token khác null là màn hình này chạy, không phải sửa gì.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import type { MessageKey } from '@aftervia/i18n';
import type { DeletionPendingStep } from '@aftervia/domain';
import { isDeletionRequestId } from '@aftervia/domain';
import { useLocale } from '../src/locale';
import { API_BASE, SESSION_TOKEN } from '../src/config';
import { newDeletionRequestId, requestDeletion, type DeletionAttempt } from '../src/privacy/request-deletion';
import { COLORS, SPACING } from '../src/ui/theme';

const PENDING_KEY: Record<DeletionPendingStep, MessageKey> = {
  primary_data_erasure: 'privacy.delete.pending.primary_data_erasure',
  retention_policy: 'privacy.delete.pending.retention_policy',
  append_only_erasure: 'privacy.delete.pending.append_only_erasure',
  session_revocation: 'privacy.delete.pending.session_revocation',
  identity_verification: 'privacy.delete.pending.identity_verification',
  tombstone_registry_outside_backup: 'privacy.delete.pending.tombstone_registry_outside_backup',
};

export function refusalKey(attempt: DeletionAttempt): MessageKey {
  switch (attempt.kind) {
    case 'reauth_required':
      return 'privacy.delete.reauth';
    case 'signed_out':
      return 'privacy.delete.signedOut';
    case 'invalid':
      return 'privacy.delete.error.requestId';
    case 'network':
      return 'desk.result.offline';
    case 'refused':
      if (attempt.reason === 'invalid_state') return 'privacy.delete.refused.invalid_state';
      if (attempt.reason === 'invalid_input') return 'privacy.delete.refused.invalid_input';
      if (attempt.reason === 'rate_limited') return 'privacy.delete.refused.rate_limited';
      return 'privacy.delete.refused.other';
    default:
      return 'privacy.delete.refused.other';
  }
}

export default function PrivacyScreen() {
  const { t } = useLocale();
  const [requestId, setRequestId] = useState<string>(() => newDeletionRequestId());
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<MessageKey | null>(null);
  const [attempt, setAttempt] = useState<DeletionAttempt | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    if (busy) return;
    if (!isDeletionRequestId(requestId)) {
      setError('privacy.delete.error.requestId');
      setAttempt(null);
      return;
    }
    if (confirm.trim().toUpperCase() !== t('privacy.delete.confirm.word').trim().toUpperCase()) {
      setError('privacy.delete.error.confirm');
      setAttempt(null);
      return;
    }
    setError(null);
    setBusy(true);
    const result = await requestDeletion(fetch, API_BASE, SESSION_TOKEN, requestId);
    setBusy(false);
    setAttempt(result);
    if (result.kind === 'requested') setConfirm('');
  }

  const receipt = attempt !== null && attempt.kind === 'requested' ? attempt : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: t('privacy.heading') }} />
      <Text style={styles.intro}>{t('privacy.intro')}</Text>

      <Text style={styles.note}>{t('privacy.mobile.export')}</Text>
      <Text style={styles.note}>{t('privacy.mobile.share')}</Text>

      <Text accessibilityRole="header" style={styles.heading}>
        {t('privacy.delete.heading')}
      </Text>
      <Text style={styles.body}>{t('privacy.delete.explain')}</Text>
      <Text style={styles.body}>{t('privacy.delete.reauthNote')}</Text>
      <Text style={styles.note}>{t('privacy.delete.legalPending')}</Text>

      <Text style={styles.label}>{t('privacy.delete.requestId.label')}</Text>
      <TextInput
        accessibilityLabel={t('privacy.delete.requestId.label')}
        value={requestId}
        onChangeText={setRequestId}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Text style={styles.note}>{t('privacy.delete.requestId.hint')}</Text>

      <Text style={styles.label}>{t('privacy.delete.confirm.label')}</Text>
      <TextInput
        accessibilityLabel={t('privacy.delete.confirm.label')}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />

      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(error)}
        </Text>
      )}

      {SESSION_TOKEN === null ? <Text style={styles.error}>{t('privacy.delete.signedOut')}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || SESSION_TOKEN === null }}
        disabled={busy || SESSION_TOKEN === null}
        onPress={() => void submit()}
        style={[styles.button, (busy || SESSION_TOKEN === null) && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{t('privacy.delete.submit')}</Text>
      </Pressable>

      {receipt === null ? null : (
        <View style={styles.receipt}>
          <Text accessibilityRole="summary" style={styles.body}>
            {t('privacy.delete.requested', { id: receipt.requestId, status: receipt.status })}
          </Text>
          <Text style={styles.label}>{t('privacy.delete.pendingHeading')}</Text>
          {receipt.pending.map((step) => (
            <Text key={step} style={styles.body}>
              {t(PENDING_KEY[step])}
            </Text>
          ))}
          {receipt.unknownPending === 0 ? null : <Text style={styles.body}>{t('privacy.delete.pending.unknown', { count: receipt.unknownPending })}</Text>}
        </View>
      )}

      {attempt === null || attempt.kind === 'requested' ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(refusalKey(attempt))}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: SPACING.gutter, gap: SPACING.gap, backgroundColor: COLORS.paper },
  heading: { color: COLORS.ink, fontSize: 18, fontWeight: '700', marginTop: SPACING.gutter },
  intro: { color: COLORS.ink, fontSize: 16 },
  body: { color: COLORS.ink, fontSize: 15 },
  note: { color: COLORS.inkMuted, fontSize: 14 },
  label: { color: COLORS.inkMuted, fontSize: 14, marginTop: SPACING.gap },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.gap,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  error: { color: '#B3261E', fontSize: 14 },
  button: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.gap,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },
  receipt: { gap: 4, marginTop: SPACING.gap },
});
