// The alert model (GS-050): the CAP v1.2 fields this product uses. Every source is translated into this shape by
// lib/alerts/transform.ts, and the rules in filter.ts apply to all of them the same way.

export const STATUSES = ['Actual', 'Exercise', 'System', 'Test', 'Draft'] as const;
export const MSG_TYPES = ['Alert', 'Update', 'Cancel', 'Ack', 'Error'] as const;
export const SCOPES = ['Public', 'Restricted', 'Private'] as const;
// Quan trắc (observation), dự báo (forecast), cảnh báo (warning), lệnh (order).
export const KINDS = ['observation', 'forecast', 'warning', 'order'] as const;

export type Status = (typeof STATUSES)[number];
export type MsgType = (typeof MSG_TYPES)[number];
export type Scope = (typeof SCOPES)[number];
export type Kind = (typeof KINDS)[number];

export type Alert = {
  source: string; // the feed it came from: 'usgs', 'gdacs'
  id: string; // the identifier inside that feed
  sender: string; // the issuing agency, as the reader sees it
  status: Status;
  msgType: MsgType;
  scope: Scope;
  kind: Kind;
  headline: string;
  hazard: string; // a card hazard when the source gives one ('earthquake', 'flood', ...), else ''
  sent: string; // ISO 8601 (UTC): when the agency issued the message
  received: string; // ISO 8601 (UTC): when this product received it
  effective: string; // ISO 8601 (UTC): when it takes effect
  references: string[]; // "source:id" of the alerts this message updates or cancels
  where?: { lat: number; lon: number }; // the place of the event, when the source gives one
};

export function keyOf(alert: Pick<Alert, 'source' | 'id'>): string {
  return `${alert.source}:${alert.id}`;
}
