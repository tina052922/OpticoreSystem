import Link from "next/link";

type Props = {
  insBasePath: string;
  facultyCount: number;
  sectionCount: number;
  roomCount: number;
};

/** Shared with INS inner tabs so `/…/ins?tab=` stays consistent across roles. */
export function insTabHref(basePath: string, tab: "faculty" | "section" | "room") {
  const root = basePath.replace(/\/(faculty|section|room)\/?$/, "").replace(/\/$/, "") || basePath;
  return `${root}?tab=${tab}`;
}

/**
 * Quick navigation + counts for the three INS schedule groupings (Program by Teacher, by Section, by Room).
 */
export function InsEntityGroupingStrip({ insBasePath, facultyCount, sectionCount, roomCount }: Props) {
  const enabled =
    insBasePath.includes("/college") ||
    insBasePath.includes("/gec") ||
    insBasePath.includes("/chairman") ||
    insBasePath.includes("/doi") ||
    insBasePath.includes("/faculty");
  if (!enabled) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <Link href={insTabHref(insBasePath, "faculty")} className="font-medium text-[#780301] hover:underline">
            By faculty
          </Link>
          <span className="text-gray-500"> ({facultyCount} with classes)</span>
        </span>
        <span>
          <Link href={insTabHref(insBasePath, "section")} className="font-medium text-[#780301] hover:underline">
            By section
          </Link>
          <span className="text-gray-500"> ({sectionCount})</span>
        </span>
        <span>
          <Link href={insTabHref(insBasePath, "room")} className="font-medium text-[#780301] hover:underline">
            By room
          </Link>
          <span className="text-gray-500"> ({roomCount})</span>
        </span>
      </div>
    </div>
  );
}
