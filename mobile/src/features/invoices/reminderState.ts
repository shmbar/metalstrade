// Reminder-button state — port of the web invoices grid's `reminder` column
// predicate (app/(root)/invoices/page.js:493-530).
//
// Mobile previously showed the reminder button on `apiConfigured() && balance > 0.01`
// alone: no issued/draft/canceled check, no 24h cooldown, and no follow-up cadence.
// That let a user email a client about a DRAFT or CANCELED invoice, and spam them
// repeatedly within the cooldown web enforces.

import { resolveDueDate } from '@shared/pureHelpers';

export interface ReminderState {
  /** render the button at all */
  visible: boolean;
  /** within the 24h cooldown — button must be disabled */
  onCooldown: boolean;
  cooldownHoursLeft: number;
  /** amber dot: due for follow-up, or overdue and never reminded */
  showFollowupDot: boolean;
  isOverdue: boolean;
}

export function reminderState(row: any, settings: any): ReminderState {
  // Issued = not a draft and not canceled (matches Cashflow debt logic).
  const isCanceled = !!row?.canceled;
  const isIssued = row?.draft !== true && !isCanceled;
  const totalAmt = parseFloat(row?.totalAmount) || 0;
  const totalPaid = (row?.payments || []).reduce((s: number, p: any) => s + (parseFloat(p?.pmnt) || 0), 0);
  const balanceDue = row?.debtBlnc != null ? parseFloat(row.debtBlnc) : totalAmt - totalPaid;
  const isUnpaid = balanceDue > 0;

  const dueDate = resolveDueDate(row);
  const isOverdue = !!dueDate && new Date(dueDate) < new Date();

  if (!isIssued || !isUnpaid) {
    return { visible: false, onCooldown: false, cooldownHoursLeft: 0, showFollowupDot: false, isOverdue };
  }

  // 24h cooldown — prevents accidentally spamming clients.
  const lastReminder = row?.reminders?.length ? row.reminders[row.reminders.length - 1] : null;
  const hoursSinceLastReminder = lastReminder?.sentAt
    ? (Date.now() - new Date(lastReminder.sentAt).getTime()) / 36e5
    : Infinity;
  const onCooldown = hoursSinceLastReminder < 24;
  const cooldownHoursLeft = onCooldown ? Math.ceil(24 - hoursSinceLastReminder) : 0;

  // Cadence — flag invoices not nudged in N days (user-configured, default 7).
  const cadenceDays = parseFloat(settings?.ReminderCadence?.days);
  const cadence = Number.isFinite(cadenceDays) && cadenceDays > 0 ? cadenceDays : 7;
  const daysSinceLastReminder = hoursSinceLastReminder / 24;
  // "Due for follow-up" only AFTER a first reminder was sent — never before.
  const dueForFollowup = !!lastReminder && !onCooldown && daysSinceLastReminder >= cadence;
  // "Never reminded but overdue" also gets a dot.
  const neverReminded = !lastReminder && isOverdue;

  return {
    visible: true,
    onCooldown,
    cooldownHoursLeft,
    showFollowupDot: dueForFollowup || neverReminded,
    isOverdue,
  };
}
