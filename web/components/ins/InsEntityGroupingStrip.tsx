import Link from "next/link";

type Props = {
  insBasePath: string;
  facultyCount: number;
  sectionCount: number;
  roomCount: number;
};

/**
 * College Admin / GEC parity: quick navigation + counts for the three INS schedule groupings
 * (Program by Teacher, by Section, by Room).
 */
export function InsEntityGroupingStrip({ insBasePath, facultyCount, sectionCount, roomCount }: Props) {
  if (!insBasePath.includes("/college") && !insBasePath.includes("/gec")) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
      <p className="font-semibold text-gray-900 mb-2">Schedule views by entity (matches College Admin)</p>
      <p className="text-xs text-gray-600 mb-2">
        Browse live <code className="text-[11px] bg-gray-100 px-1 rounded">ScheduleEntry</code> data as Program by
        Teacher, by Section, or by Room — counts are for the current term in scope.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <Link href={`${insBasePath}/faculty`} className="font-medium text-[#780301] hover:underline">
            By faculty
          </Link>
          <span className="text-gray-500"> ({facultyCount} with classes)</span>
        </span>
        <span>
          <Link href={`${insBasePath}/section`} className="font-medium text-[#780301] hover:underline">
            By section
          </Link>
          <span className="text-gray-500"> ({sectionCount})</span>
        </span>
        <span>
          <Link href={`${insBasePath}/room`} className="font-medium text-[#780301] hover:underline">
            By room
          </Link>
          <span className="text-gray-500"> ({roomCount})</span>
        </span>
      </div>
    </div>
  );
}
