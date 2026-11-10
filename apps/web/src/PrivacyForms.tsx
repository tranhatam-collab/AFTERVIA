// Màn Quyền riêng tư của Web Desk (WO11-03): xuất, chia sẻ và xóa tài khoản đứng cùng một chỗ.
// Xuất và chia sẻ dùng lại SharingForms (WO10-03f); phần mới ở đây là yêu cầu xóa tài khoản.
//
// Ba quy tắc của phần xóa:
//  1. Phải gõ đúng chữ xác nhận, vì thao tác không hoàn tác được.
//  2. 401 nghĩa là phiên quá cũ (xác thực lại trong 5 phút), không phải "không có quyền".
//  3. Nhận được biên nhận KHÔNG phải là đã xóa xong: các bước còn lại được liệt kê ra, không giấu đi.
import { useId, useRef, useState, type FormEvent } from 'react';
import { t, type Locale, type MessageKey } from '@aftervia/i18n';
import type { DeletionPendingStep } from '@aftervia/domain';
import type { ActionOptions, CaseSummary } from './actions';
import { requestAccountDeletion, type DeletionAttempt } from './privacy';
import { checkDeletion, newDeletionRequestId, type DeletionFormValues } from './privacy-forms';
import { SharingForms } from './SharingForms';

const PENDING_KEY: Record<DeletionPendingStep, MessageKey> = {
  primary_data_erasure: 'privacy.delete.pending.primary_data_erasure',
  retention_policy: 'privacy.delete.pending.retention_policy',
  append_only_erasure: 'privacy.delete.pending.append_only_erasure',
  session_revocation: 'privacy.delete.pending.session_revocation',
  identity_verification: 'privacy.delete.pending.identity_verification',
  tombstone_registry_outside_backup: 'privacy.delete.pending.tombstone_registry_outside_backup',
};

// Mỗi lý do từ chối có một câu riêng; lý do chưa có câu riêng dùng câu chung "chưa xác nhận được".
function refusalKey(attempt: DeletionAttempt): MessageKey {
  switch (attempt.kind) {
    case 'reauth_required':
      return 'privacy.delete.reauth';
    case 'signed_out':
      return 'privacy.delete.signedOut';
    case 'invalid':
      return 'privacy.delete.error.requestId';
    case 'offline':
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

function DeleteAccountForm({ locale, base, token }: { locale: Locale; base: string; token: string | null }) {
  const headingId = useId();
  const requestFieldId = useId();
  const confirmFieldId = useId();
  const hintId = useId();
  const [values, setValues] = useState<DeletionFormValues>(() => ({
    requestId: newDeletionRequestId(() => crypto.randomUUID()),
    confirm: '',
  }));
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<MessageKey | null>(null);
  const [attempt, setAttempt] = useState<DeletionAttempt | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkDeletion(values, t(locale, 'privacy.delete.confirm.word'));
    if (!checked.ok) {
      setFieldError(checked.error);
      setAttempt(null);
      return;
    }
    setFieldError(null);
    inFlight.current = true;
    setBusy(true);
    const options: ActionOptions = { fetchImpl: fetch, base, token, online: navigator.onLine };
    const result = await requestAccountDeletion(options, checked.value.requestId);
    inFlight.current = false;
    setBusy(false);
    setAttempt(result);
    // Đã ghi nhận thì xóa chữ xác nhận, nhưng GIỮ mã yêu cầu: gửi lại cùng mã trả về cùng biên nhận.
    if (result.kind === 'requested') setValues((s) => ({ ...s, confirm: '' }));
  }

  const receipt = attempt !== null && attempt.kind === 'requested' ? attempt.receipt : null;

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'privacy.delete.heading')}</h2>
      <p>{t(locale, 'privacy.delete.explain')}</p>
      <p>{t(locale, 'privacy.delete.reauthNote')}</p>
      <p role="note">{t(locale, 'privacy.delete.legalPending')}</p>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="field">
          <label htmlFor={requestFieldId}>{t(locale, 'privacy.delete.requestId.label')}</label>
          <input
            id={requestFieldId}
            name="deletionRequestId"
            type="text"
            aria-describedby={hintId}
            value={values.requestId}
            onChange={(e) => {
              const v = e.target.value;
              setValues((s) => ({ ...s, requestId: v }));
            }}
          />
          <p id={hintId}>{t(locale, 'privacy.delete.requestId.hint')}</p>
        </div>
        <div className="field">
          <label htmlFor={confirmFieldId}>{t(locale, 'privacy.delete.confirm.label')}</label>
          <input
            id={confirmFieldId}
            name="deletionConfirm"
            type="text"
            value={values.confirm}
            onChange={(e) => {
              const v = e.target.value;
              setValues((s) => ({ ...s, confirm: v }));
            }}
          />
        </div>
        {fieldError === null ? null : <p role="alert">{t(locale, fieldError)}</p>}
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'privacy.delete.submit')}
        </button>
      </form>
      {receipt === null ? null : (
        <div>
          <p role="status">{t(locale, 'privacy.delete.requested', { id: receipt.requestId, status: receipt.status })}</p>
          <p>{t(locale, 'privacy.delete.pendingHeading')}</p>
          <ul>
            {receipt.pending.map((step) => (
              <li key={step}>{t(locale, PENDING_KEY[step])}</li>
            ))}
          </ul>
          {receipt.unknownPending === 0 ? null : <p>{t(locale, 'privacy.delete.pending.unknown', { count: receipt.unknownPending })}</p>}
        </div>
      )}
      {attempt === null || attempt.kind === 'requested' ? null : <p role="alert">{t(locale, refusalKey(attempt))}</p>}
    </section>
  );
}

export function PrivacyForms(props: { locale: Locale; base: string; token: string | null; activeCase: CaseSummary | null }) {
  const headingId = useId();
  return (
    <div className="privacy">
      <h2 id={headingId}>{t(props.locale, 'privacy.heading')}</h2>
      <p>{t(props.locale, 'privacy.intro')}</p>
      <SharingForms locale={props.locale} base={props.base} token={props.token} activeCase={props.activeCase} />
      <DeleteAccountForm locale={props.locale} base={props.base} token={props.token} />
    </div>
  );
}
