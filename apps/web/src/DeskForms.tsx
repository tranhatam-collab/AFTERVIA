// Điều khiển của Web Desk (WO10-03e): thêm món, mở case và chuyển trạng thái, qua lớp yêu cầu của actions.ts.
// Nút bị khóa khi đang gửi. Khóa idempotency được giữ cho lần gửi lại đúng nội dung cũ (forms.ts).
// Không dựng liên kết từ dữ liệu; mọi chữ hiển thị đi qua t().
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CASE_STATES, RESOLUTION_OUTCOMES } from '@aftervia/domain';
import { t, type Locale, type MessageKey } from '@aftervia/i18n';
import { addItem, openCase, transitionCase, type ActionOptions, type ActionResult, type CaseSummary } from './actions';
import { SharingForms } from './SharingForms';
import {
  DEFAULT_CURRENCY,
  OUTCOME_KEY,
  STATUS_KEY,
  checkCase,
  checkItem,
  checkTransition,
  failureKey,
  keyFor,
  type CaseFormValues,
  type ItemFormValues,
  type PendingKey,
  type TransitionFormValues,
} from './forms';

export interface DeskFormsProps {
  locale: Locale;
  base: string;
  token: string | null;
  activeCase: CaseSummary | null;
  onItemAdded: () => void;
  onCaseChanged: (summary: CaseSummary) => void;
}

interface Notice {
  tone: 'status' | 'alert';
  text: string;
}

type FieldError = MessageKey | null;

const EMPTY_ITEM: ItemFormValues = { title: '', brand: '', model: '', purchasedOn: '', currency: DEFAULT_CURRENCY };
const EMPTY_CASE: CaseFormValues = { itemId: '', organizationId: '', description: '' };
const EMPTY_TRANSITION: TransitionFormValues = { caseId: '', expectedVersion: '', nextState: 'submitted', reason: '', outcome: '' };

function optionsFor(base: string, token: string | null): ActionOptions {
  return { fetchImpl: fetch, base, token, online: navigator.onLine };
}

function newKey(): string {
  return crypto.randomUUID();
}

function failureNotice(locale: Locale, result: ActionResult<unknown>): Notice {
  return { tone: 'alert', text: t(locale, failureKey(result) ?? 'desk.result.error') };
}

function TextField(props: {
  id: string;
  name: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  multiline?: boolean;
  maxLength?: number;
}) {
  const { id, name, label, value, onValue, type = 'text', multiline = false, maxLength } = props;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} name={name} value={value} maxLength={maxLength} onChange={(e) => onValue(e.target.value)} />
      ) : (
        <input id={id} name={name} type={type} value={value} maxLength={maxLength} onChange={(e) => onValue(e.target.value)} />
      )}
    </div>
  );
}

function SelectField(props: { id: string; name: string; label: string; value: string; onValue: (value: string) => void; children: ReactNode }) {
  const { id, name, label, value, onValue, children } = props;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} value={value} onChange={(e) => onValue(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

function FieldErrorLine({ locale, error }: { locale: Locale; error: FieldError }) {
  return error === null ? null : <p role="alert">{t(locale, error)}</p>;
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  return notice === null ? null : <p role={notice.tone}>{notice.text}</p>;
}

function ItemForm({ locale, base, token, onAdded }: { locale: Locale; base: string; token: string | null; onAdded: () => void }) {
  const headingId = useId();
  const titleId = useId();
  const brandId = useId();
  const modelId = useId();
  const purchasedOnId = useId();
  const currencyId = useId();
  const [values, setValues] = useState<ItemFormValues>(EMPTY_ITEM);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkItem(values);
    if (!checked.ok) {
      setFieldError(checked.error);
      setNotice(null);
      return;
    }
    setFieldError(null);
    inFlight.current = true;
    setBusy(true);
    const result = await addItem(optionsFor(base, token), checked.value);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setValues(EMPTY_ITEM);
      setNotice({ tone: 'status', text: t(locale, 'desk.item.added') });
      onAdded();
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'item.add')}</h2>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <TextField id={titleId} name="title" label={t(locale, 'item.title.label')} value={values.title} maxLength={200} onValue={(v) => setValues((s) => ({ ...s, title: v }))} />
        <TextField id={brandId} name="brand" label={t(locale, 'item.brand.label')} value={values.brand} onValue={(v) => setValues((s) => ({ ...s, brand: v }))} />
        <TextField id={modelId} name="model" label={t(locale, 'item.model.label')} value={values.model} onValue={(v) => setValues((s) => ({ ...s, model: v }))} />
        <TextField id={purchasedOnId} name="purchasedOn" type="date" label={t(locale, 'item.purchasedOn.label')} value={values.purchasedOn} onValue={(v) => setValues((s) => ({ ...s, purchasedOn: v }))} />
        <TextField id={currencyId} name="currency" label={t(locale, 'item.currency.label')} value={values.currency} maxLength={3} onValue={(v) => setValues((s) => ({ ...s, currency: v }))} />
        <FieldErrorLine locale={locale} error={fieldError} />
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.item.submit')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

function CaseOpenForm({ locale, base, token, onOpened }: { locale: Locale; base: string; token: string | null; onOpened: (summary: CaseSummary) => void }) {
  const headingId = useId();
  const itemIdId = useId();
  const organizationIdId = useId();
  const descriptionId = useId();
  const [values, setValues] = useState<CaseFormValues>(EMPTY_CASE);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingKey | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkCase(values);
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
    const result = await openCase(optionsFor(base, token), checked.value, key.key);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setPending(null);
      setValues(EMPTY_CASE);
      setNotice({
        tone: 'status',
        text: t(locale, 'desk.case.opened', { id: result.value.id, status: t(locale, STATUS_KEY[result.value.status]), version: result.value.version }),
      });
      onOpened(result.value);
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'desk.case.open')}</h2>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <TextField id={itemIdId} name="itemId" label={t(locale, 'desk.case.itemId.label')} value={values.itemId} onValue={(v) => setValues((s) => ({ ...s, itemId: v }))} />
        <TextField id={organizationIdId} name="organizationId" label={t(locale, 'desk.case.organizationId.label')} value={values.organizationId} onValue={(v) => setValues((s) => ({ ...s, organizationId: v }))} />
        <TextField id={descriptionId} name="description" multiline maxLength={500} label={t(locale, 'desk.case.description.label')} value={values.description} onValue={(v) => setValues((s) => ({ ...s, description: v }))} />
        <FieldErrorLine locale={locale} error={fieldError} />
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.case.open')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

function TransitionForm({
  locale,
  base,
  token,
  activeCase,
  onMoved,
}: {
  locale: Locale;
  base: string;
  token: string | null;
  activeCase: CaseSummary | null;
  onMoved: (summary: CaseSummary) => void;
}) {
  const headingId = useId();
  const caseIdId = useId();
  const versionId = useId();
  const nextStateId = useId();
  const reasonId = useId();
  const outcomeId = useId();
  const [values, setValues] = useState<TransitionFormValues>(EMPTY_TRANSITION);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingKey | null>(null);
  const inFlight = useRef(false);

  // Case vừa mở hoặc vừa chuyển trạng thái được điền sẵn: mã case và phiên bản đang xem.
  useEffect(() => {
    if (activeCase === null) return;
    setValues((s) => ({ ...s, caseId: activeCase.id, expectedVersion: String(activeCase.version) }));
  }, [activeCase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const checked = checkTransition(values);
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
    const result = await transitionCase(optionsFor(base, token), checked.value.caseId, checked.value.input, key.key);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'success') {
      setPending(null);
      setValues((s) => ({ ...s, expectedVersion: String(result.value.version), reason: '', outcome: '' }));
      setNotice({ tone: 'status', text: t(locale, 'desk.transition.moved', { status: t(locale, STATUS_KEY[result.value.status]), version: result.value.version }) });
      onMoved(result.value);
      return;
    }
    setNotice(failureNotice(locale, result));
  }

  return (
    <section className="desk-form" aria-labelledby={headingId}>
      <h2 id={headingId}>{t(locale, 'desk.transition.heading')}</h2>
      {activeCase === null ? null : (
        <p>{t(locale, 'desk.case.active', { id: activeCase.id, status: t(locale, STATUS_KEY[activeCase.status]), version: activeCase.version })}</p>
      )}
      <form onSubmit={(event) => void submit(event)} noValidate>
        <TextField id={caseIdId} name="caseId" label={t(locale, 'desk.transition.caseId.label')} value={values.caseId} onValue={(v) => setValues((s) => ({ ...s, caseId: v }))} />
        <TextField id={versionId} name="expectedVersion" type="number" label={t(locale, 'desk.transition.expectedVersion.label')} value={values.expectedVersion} onValue={(v) => setValues((s) => ({ ...s, expectedVersion: v }))} />
        <SelectField id={nextStateId} name="nextState" label={t(locale, 'desk.transition.nextState.label')} value={values.nextState} onValue={(v) => setValues((s) => ({ ...s, nextState: v }))}>
          {CASE_STATES.map((state) => (
            <option key={state} value={state}>
              {t(locale, STATUS_KEY[state])}
            </option>
          ))}
        </SelectField>
        <TextField id={reasonId} name="reason" multiline maxLength={500} label={t(locale, 'desk.transition.reason.label')} value={values.reason} onValue={(v) => setValues((s) => ({ ...s, reason: v }))} />
        <SelectField id={outcomeId} name="outcome" label={t(locale, 'desk.transition.outcome.label')} value={values.outcome} onValue={(v) => setValues((s) => ({ ...s, outcome: v }))}>
          <option value="">—</option>
          {RESOLUTION_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {t(locale, OUTCOME_KEY[outcome])}
            </option>
          ))}
        </SelectField>
        <FieldErrorLine locale={locale} error={fieldError} />
        <button type="submit" disabled={busy}>
          {busy ? t(locale, 'desk.form.sending') : t(locale, 'desk.transition.submit')}
        </button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

// Ba biểu mẫu của Web Desk, đặt dưới danh sách. Trạng thái case đang làm việc nằm ở App.
export function DeskForms(props: DeskFormsProps) {
  return (
    <div className="desk-forms">
      <ItemForm locale={props.locale} base={props.base} token={props.token} onAdded={props.onItemAdded} />
      <CaseOpenForm locale={props.locale} base={props.base} token={props.token} onOpened={props.onCaseChanged} />
      <TransitionForm locale={props.locale} base={props.base} token={props.token} activeCase={props.activeCase} onMoved={props.onCaseChanged} />
      <SharingForms locale={props.locale} base={props.base} token={props.token} activeCase={props.activeCase} />
    </div>
  );
}
