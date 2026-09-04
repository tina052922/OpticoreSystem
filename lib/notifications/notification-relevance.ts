/**
 * Notification filtering for Instructor/Student roles.
 *
 * Project requirement: for these roles, the Notification bell must show only
 * functional updates (published timetable / class updates + upcoming class reminders),
 * and hide general administrative announcements.
 *
 * There is currently no dedicated DB column for “notification category”, so
 * we filter using message text patterns emitted by workflow routes/triggers.
 */

function norm(message: string): string {
  return message.trim().toLowerCase();
}

export function isScheduleRelatedNotificationMessage(message: string): boolean {
  const m = norm(message);

  // Schedule updates:
  // - Triggered by College/DOI publication workflow fan-out
  const schedulePatterns = [
    "master schedule for",
    "your class has been changed",
    "your class is now scheduled",
    "view your final timetable",
    "view your section timetable",
  ];

  // Upcoming reminders (future-proof: currently may not be used by message templates).
  const reminderPatterns = ["upcoming", "reminder", "next class", "tomorrow"];

  // Hard exclude known administrative/global-noise messages for safety.
  // (These messages may still exist in the Notification table, but must not be shown to students/instructors.)
  const adminNoisePatterns = ["plotted or updated", "open ins form", "audit log", "policy", "access request", "work order"];

  if (adminNoisePatterns.some((p) => m.includes(p))) return false;

  if (schedulePatterns.some((p) => m.includes(p))) return true;
  if (reminderPatterns.some((p) => m.includes(p))) return true;

  return false;
}

