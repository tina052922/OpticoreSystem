/** Matches Opticore-CampusIntelligence module titles (Dashboard, INS, Inbox, Evaluator, etc.). */
export function ChairmanPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-6 pt-6 pb-2">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
      <p className="text-gray-600 text-sm">{subtitle}</p>
    </div>
  );
}
