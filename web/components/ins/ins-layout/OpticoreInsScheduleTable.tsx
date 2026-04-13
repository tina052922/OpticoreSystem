import type { ReactNode } from "react";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import { INS_DAYS, INS_TIME_SLOTS } from "./opticore-ins-constants";

const vLabel = {
  writingMode: "vertical-rl" as const,
  transform: "rotate(180deg)",
};

type Props = {
  /** Render cell content for each time row and day column */
  renderCell: (time: string, day: (typeof INS_DAYS)[number]) => ReactNode;
  /** When term is VPAA-approved, show signature images + names in fixed order */
  signatureSlots?: InsSignatureSlot[] | null;
  /** True when schedule rows are locked by VPAA publication */
  scheduleApproved?: boolean;
};

/**
 * Weekly grid + Opticore-style vertical signature columns.
 * Order (left→right): Approved by → Campus Director → Reviewed & Certified → Contract → Prepared by.
 */
export function OpticoreInsScheduleTableWithSignatures({
  renderCell,
  signatureSlots,
  scheduleApproved = false,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-0">
        <table className="flex-1 min-w-0 border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-1 py-2 text-[10px] font-semibold text-gray-900">TIME</th>
              {INS_DAYS.map((day) => (
                <th key={day} className="border border-gray-400 px-1 py-2 text-[10px] font-semibold text-gray-900">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INS_TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="border border-gray-400 px-1 py-2 text-[10px] font-medium text-gray-900 whitespace-nowrap">
                  {time}
                </td>
                {INS_DAYS.map((day) => (
                  <td
                    key={`${time}-${day}`}
                    className="border border-gray-400 px-1 py-2 text-[10px] text-gray-900 align-top min-h-[52px]"
                  >
                    {renderCell(time, day)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <InsSignatureStrip signatureSlots={signatureSlots} scheduleApproved={scheduleApproved} />
      </div>
    </div>
  );
}

const FALLBACK_SLOTS: InsSignatureSlot[] = [
  { key: "approved", lineTitle: "Approved by", lineSubtitle: "DOI / VPAA", signerName: "—", imageUrl: null },
  { key: "campus", lineTitle: "Campus Director", lineSubtitle: "Campus", signerName: "—", imageUrl: null },
  { key: "review", lineTitle: "Reviewed & Certified by", lineSubtitle: "Chairman", signerName: "—", imageUrl: null },
  { key: "contract", lineTitle: "Contract", lineSubtitle: "Signatory", signerName: "—", imageUrl: null },
  { key: "prepared", lineTitle: "Prepared by", lineSubtitle: "College Admin", signerName: "—", imageUrl: null },
];

function InsSignatureStrip({
  signatureSlots,
  scheduleApproved,
}: {
  signatureSlots?: InsSignatureSlot[] | null;
  scheduleApproved: boolean;
}) {
  const slots = signatureSlots ?? FALLBACK_SLOTS;

  return (
    <div className="hidden md:flex shrink-0 gap-1">
      {slots.map((s) => (
        <div
          key={s.key}
          className="flex flex-col items-stretch w-[72px] border border-gray-400 border-l-0 bg-white first:border-l first:rounded-l-sm last:rounded-r-sm overflow-hidden"
        >
          <div className="bg-gray-50 px-0.5 py-2 min-h-[120px] flex flex-col items-center justify-between gap-1">
            <div className="text-[8px] font-semibold text-gray-800 text-center leading-tight" style={vLabel}>
              {s.lineTitle}
            </div>
            {scheduleApproved && s.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded public URLs
              <img src={s.imageUrl} alt="" className="max-h-14 w-full object-contain object-bottom" />
            ) : (
              <div
                className="h-12 w-full border border-dashed border-gray-300 rounded bg-gray-50/80"
                title={scheduleApproved ? "No signature on file — upload in Profile" : "Pending publication"}
              />
            )}
          </div>
          <div className="border-t border-gray-200 px-0.5 py-1 bg-white">
            <div className="text-[7px] text-gray-500 text-center leading-none mb-0.5">{s.lineSubtitle}</div>
            <div className="text-[8px] font-medium text-gray-900 text-center leading-tight line-clamp-3">{s.signerName}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
