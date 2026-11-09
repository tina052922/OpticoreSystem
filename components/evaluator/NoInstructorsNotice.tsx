import Link from "next/link";
import { UserPlus } from "lucide-react";

export { facultyProfileHrefForInsBase } from "@/lib/evaluator/faculty-profile-href";

/**
 * Shown wherever an instructor list comes up empty — nobody assigned, registered or added for this
 * program (or, for GEC, no GEC instructors). Says what to do instead of leaving a blank picker.
 */
export function NoInstructorsNotice({
  facultyProfileHref,
  gec = false,
  compact = false,
}: {
  facultyProfileHref: string;
  /** GEC Chairman wording: GEC instructors specifically. */
  gec?: boolean;
  /** Tighter variant for inside the Plot schedule window. */
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={`rounded-lg border border-amber-200 bg-amber-50 text-amber-950 ${
        compact ? "mt-1.5 px-2.5 py-2 text-[11px]" : "px-3 py-2.5 text-[12px]"
      }`}
    >
      <p className="font-semibold">{gec ? "No GEC instructors available." : "No instructors available."}</p>
      <p className="mt-0.5 text-amber-900/90">
        {gec
          ? "Add an instructor in Faculty Profile with category GEC instructor, or have them register as a GEC instructor."
          : "Add or register an instructor for this program first — add them in Faculty Profile, or have them register and approve them in Instructor Management."}
      </p>
      <Link
        href={facultyProfileHref}
        className="mt-1.5 inline-flex items-center gap-1 font-semibold text-[#780301] hover:underline"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden />
        Open Faculty Profile
      </Link>
    </div>
  );
}
