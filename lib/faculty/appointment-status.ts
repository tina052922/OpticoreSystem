/** INS Form 5A "Status of Appointment" (FacultyProfile.appointmentStatus, migration 034). */
export const APPOINTMENT_STATUS_OPTIONS = [
  { code: "permanent", label: "Permanent" },
  { code: "temporary", label: "Temporary" },
  { code: "cos", label: "Contract of Service" },
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS_OPTIONS)[number]["code"];

export function normalizeAppointmentStatus(raw: unknown): AppointmentStatus | "" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "permanent" || s === "temporary" || s === "cos") return s;
  if (s === "contract of service") return "cos";
  return "";
}

export function appointmentStatusLabel(raw: unknown, empty = ""): string {
  const code = normalizeAppointmentStatus(raw);
  return APPOINTMENT_STATUS_OPTIONS.find((o) => o.code === code)?.label ?? empty;
}
