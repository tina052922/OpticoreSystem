import { Clock } from "lucide-react";

/**
 * Shown to students and instructors before DOI publishes the term.
 *
 * Plotted classes are a draft until then, so the server sends none of them to these accounts; this
 * says why the page is empty instead of looking like "you have no classes".
 */
export function ScheduleNotPublishedNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 ${className}`}
    >
      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">The schedule for this term is not published yet.</p>
        <p className="opacity-80">
          Classes are still being planned. They will appear here once the DOI publishes the schedule.
        </p>
      </div>
    </div>
  );
}
