/** Matches Opticore-CampusIntelligence module titles (Dashboard, INS, Inbox, Evaluator, etc.). */
export function ChairmanPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{title}</h2>
      <p className="text-gray-600 text-sm leading-snug">{subtitle}</p>
    </div>
  );
}
