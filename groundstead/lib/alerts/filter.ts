import { keyOf, type Alert } from './model.ts';

// A message the public may see: a real (Actual), public alert or update. Tests, exercises, drafts, system messages,
// private or restricted messages, acknowledgements, errors and cancellations are all kept out (GT13).
export function isPublic(alert: Alert): boolean {
  return (
    alert.status === 'Actual' &&
    alert.scope === 'Public' &&
    (alert.msgType === 'Alert' || alert.msgType === 'Update')
  );
}

// Alerts still in force. A later Cancel or Update that names an alert ends it. A Cancel is never listed itself.
export function inForce(alerts: Alert[]): Alert[] {
  const ended = new Set<string>();
  for (const alert of alerts) {
    if (alert.msgType === 'Cancel' || alert.msgType === 'Update') {
      for (const ref of alert.references) ended.add(ref);
    }
  }
  return alerts.filter((alert) => alert.msgType !== 'Cancel' && !ended.has(keyOf(alert)));
}

// What the public sees: in force, and public.
export function publicAlerts(alerts: Alert[]): Alert[] {
  return inForce(alerts).filter(isPublic);
}
