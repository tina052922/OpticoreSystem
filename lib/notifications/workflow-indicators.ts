/**
 * Chairman “program plotted” and College Admin “GEC ready” notices.
 * Matched on message text (no dedicated Notification.kind column).
 */

export function isChairmanPlottedReadinessMessage(message: string): boolean {
  const m = message.trim().toLowerCase();
  return m.includes("majors as plotted") || m.includes("ready for college review");
}

export function isGecReadyMessage(message: string): boolean {
  const m = message.trim().toLowerCase();
  return m.includes("ready for gec plotting");
}

export function isWorkflowReadinessMessage(message: string): boolean {
  return isChairmanPlottedReadinessMessage(message) || isGecReadyMessage(message);
}
