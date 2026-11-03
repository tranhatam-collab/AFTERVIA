// Điều khiển chia tài liệu, thu hồi quyền và tạo gói xuất của Web Desk (WO10-03f), qua lớp yêu cầu của sharing.ts.
// Nút bị khóa khi đang gửi; khóa idempotency giữ cho lần gửi lại đúng nội dung cũ. Không dựng liên kết từ dữ liệu.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { t, type Locale, type MessageKey } from '@aftervia/i18n';
import type { ActionOptions, ActionResult, CaseSummary } from './actions';
import { failureKey, keyFor, type PendingKey } from './forms';
import { grantDocument, requestExport, revokeGrant } from './sharing';
import { checkGrant, checkRevoke, localInput, type GrantFormValues, type RevokeFormValues } from './sharing-forms';

interface Notice {
  tone: 'status' | 'alert';
  text: string;
}

type FieldError = MessageKey | null;

interface Shared {
  locale: Locale;
  base: string;
  token: string | null;
  activeCase: CaseSummary | null;
}

const WEEK_MS = 7 * 86_400_000;

function optionsFor(base: string, token: string | null): ActionOptions {
  return { fetchImpl: fetch, base, token, online: navigator.onLine };
}

function newKey(): string {
  return crypto.randomUUID();
}

function failureNotice(locale: Locale, result: ActionResult<unknown>): Notice {
  return { tone: 'alert', text: t(locale, failureKey(result) ?? 'desk.result.error') };
}

function Field(props: { id: string; name: string; label: string; value: string; onValue: (value: string) => void; type?: 'text' | 'datetime-local' }) {
  const { id, name, label, value, onValue, type = 'text' } = props;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} value={value} onChange={(e) => onValue(e.target.value)} />
    </div>
  );
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  return notice === null ? null : <p role={notice.tone}>{notice.text}</p>;
}

function FieldErrorLine({ locale, error }: { locale: Locale; error: FieldError }) {
  return error === null ? null : <p role="alert">{t(locale, error)}</p>;
}

function GrantForm({ locale, base, token, activeCase }: Shared) {
  const headingId = useId();
  const caseId = useId();
  const documentId = useId();
  const recipientId = useId();
  const expiresId = useId();
  const downloadId = useId();
  const [values, setValues] = useState<GrantFormValues>(() => ({
    caseId: '',
    documentId: '',
    recipientId: '',
    expiresAt: localInput(new Date(Date.now() + WEEK_MS)),
    canDownload: false,
  }));
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingKey | null>(null);
  const inFlight = useRef(false);

  // Case đang làm việc được điền sẵn làm mã case.
  useEffect(() => {
    if (activeCase === null) return;
    setValues((s) => ({ ...s, caseId: activeCase.id }));
  }, [activeCase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkGrant(values, new Date());
    if (!checked.ok) {
      setFieldError(checked.error);
      setNotice(null);
      return;
    }
    setFieldError(null);
    const key = keyFor(pending, JSON.stringify(checked.value), newKey);
    setPending(key);
    inFlight.current = true;
    setBusy(true);
    const result = await grantDocument(optionsFor(base, token), checked.value.caseId, checked.value.input, key.key);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setPending(null);
      setValues((s) => ({ ...s, documentId: '', recipientId: '' }));
      setNotice({ tone: 'status', text: t(locale, 'desk.grant.granted', { id: result.value.id }) });
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'desk.grant.heading')}</h2>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <Field id={caseId} name="grantCaseId" label={t(locale, 'desk.transition.caseId.label')} value={values.caseId} onValue={(v) => setValues((s) => ({ ...s, caseId: v }))} />
        <Field id={documentId} name="documentId" label={t(locale, 'desk.grant.documentId.label')} value={values.documentId} onValue={(v) => setValues((s) => ({ ...s, documentId: v }))} />
        <Field id={recipientId} name="recipientId" label={t(locale, 'desk.grant.recipientId.label')} value={values.recipientId} onValue={(v) => setValues((s) => ({ ...s, recipientId: v }))} />
        <Field id={expiresId} name="expiresAt" type="datetime-local" label={t(locale, 'desk.grant.expiresAt.label')} value={values.expiresAt} onValue={(v) => setValues((s) => ({ ...s, expiresAt: v }))} />
        <div className="field">
          <input id={downloadId} name="canDownload" type="checkbox" checked={values.canDownload} onChange={(e) => { const v = e.target.checked; setValues((s) => ({ ...s, canDownload: v })); }} />
          <label htmlFor={downloadId}>{t(locale, 'desk.grant.canDownload.label')}</label>
        </div>
        <FieldErrorLine locale={locale} error={fieldError} />
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.grant.submit')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

function RevokeForm({ locale, base, token, activeCase }: Shared) {
  const headingId = useId();
  const caseId = useId();
  const grantId = useId();
  const [values, setValues] = useState<RevokeFormValues>({ caseId: '', grantId: '' });
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (activeCase === null) return;
    setValues((s) => ({ ...s, caseId: activeCase.id }));
  }, [activeCase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkRevoke(values);
    if (!checked.ok) {
      setFieldError(checked.error);
      setNotice(null);
      return;
    }
    setFieldError(null);
    inFlight.current = true;
    setBusy(true);
    const result = await revokeGrant(optionsFor(base, token), checked.value.caseId, checked.value.grantId);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setValues((s) => ({ ...s, grantId: '' }));
      setNotice({ tone: 'status', text: t(locale, 'desk.revoke.revoked', { id: result.value.id }) });
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'desk.revoke.heading')}</h2>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <Field id={caseId} name="revokeCaseId" label={t(locale, 'desk.transition.caseId.label')} value={values.caseId} onValue={(v) => setValues((s) => ({ ...s, caseId: v }))} />
        <Field id={grantId} name="grantId" label={t(locale, 'desk.revoke.grantId.label')} value={values.grantId} onValue={(v) => setValues((s) => ({ ...s, grantId: v }))} />
        <FieldErrorLine locale={locale} error={fieldError} />
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.revoke.submit')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

// Gói xuất không có trường nhập. Khóa idempotency được giữ cho lần gửi lại sau lỗi; thành công thì lần bấm sau cấp khóa mới.
function ExportForm({ locale, base, token }: { locale: Locale; base: string; token: string | null }) {
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingKey | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const key = keyFor(pending, 'export', newKey);
    setPending(key);
    inFlight.current = true;
    setBusy(true);
    const result = await requestExport(optionsFor(base, token), key.key);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setPending(null);
      setNotice({ tone: 'status', text: t(locale, 'desk.export.created', { id: result.value.id, status: t(locale, 'desk.export.status.succeeded') }) });
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'desk.export.heading')}</h2>
      <p>{t(locale, 'desk.export.note')}</p>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.export.submit')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

// Ba điều khiển của phần chia sẻ và xuất: chia tài liệu, thu hồi quyền, tạo gói xuất.
export function SharingForms(props: { locale: Locale; base: string; token: string | null; activeCase: CaseSummary | null }) {
  return (
    <>
      <GrantForm locale={props.locale} base={props.base} token={props.token} activeCase={props.activeCase} />
      <RevokeForm locale={props.locale} base={props.base} token={props.token} activeCase={props.activeCase} />
      <ExportForm locale={props.locale} base={props.base} token={props.token} />
    </>
  );
}
