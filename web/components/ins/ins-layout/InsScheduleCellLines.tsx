/** One schedule block inside an INS grid cell — stacked lines, safe for narrow print columns. */
export function InsScheduleCellLines({
  lines,
  emphasizeFirst = true,
}: {
  lines: Array<string | null | undefined>;
  emphasizeFirst?: boolean;
}) {
  const filtered = lines.map((l) => l?.trim()).filter(Boolean) as string[];
  if (filtered.length === 0) return null;

  return (
    <div className="ins-schedule-cell w-full px-0.5 py-0.5 text-center">
      {filtered.map((line, i) => (
        <div
          key={`${i}-${line}`}
          className={`leading-snug text-[10px] sm:text-[11px] print:text-[6pt] print:leading-tight ${
            i === 0 && emphasizeFirst ? "font-semibold text-neutral-900" : "text-neutral-800"
          }`}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
