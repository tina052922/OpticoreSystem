import type { ReactNode } from "react";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { InsTimedCell } from "@/lib/ins/ins-weekly-grid-span";
import { insPickSlotRender } from "@/lib/ins/ins-weekly-grid-span";
import { INS_DAYS, INS_TIME_SLOTS } from "./opticore-ins-constants";

const vLabel = {
  writingMode: "vertical-rl" as const,
  transform: "rotate(180deg)",
};

const insTableBorder = "border border-neutral-900";

type InsDay = (typeof INS_DAYS)[number];

type Props = {
  /** When term is VPAA-approved, show signature images + names in fixed order */
  signatureSlots?: InsSignatureSlot[] | null;
  /** True when schedule rows are locked by VPAA publication */
  scheduleApproved?: boolean;
  /** Form 5C: grid only (signatures in footer). Form 5B: Campus Director column only. */
  signatureStrip?: "full" | "none" | "campusOnly";
} & (
  | {
      cellMode?: "legacy";
      /** Render cell content for each time row and day column */
      renderCell: (time: string, day: InsDay) => ReactNode;
    }
  | {
      cellMode: "spanned";
      /** One entry per plotted class; multi-hour blocks merge rows (Evaluator-style). */
      cellsByDay: Record<InsDay, InsTimedCell[]>;
      renderSpanned: (args: {
        day: InsDay;
        timeSlotLabel: string;
        slotIndex: number;
        rowSpan: number;
        items: InsTimedCell[];
        /** Empty Monday 7:00 row — paper form hint lines */
        paperFormRow?: boolean;
      }) => ReactNode;
      /** Monday 7:00–8:00 empty-cell paper template (Forms 5A–5C). */
      showMondayPlaceholder?: boolean;
    }
);

/**
 * Weekly grid + Opticore-style vertical signature columns.
 * Order (left→right): Approved by → Campus Director → Reviewed & Certified → Contract → Prepared by.
 */
export function OpticoreInsScheduleTableWithSignatures(props: Props) {
  const { signatureSlots, scheduleApproved = false, signatureStrip = "full" } = props;
  const cellMode = props.cellMode ?? "legacy";

  return (
    <div className="overflow-x-auto sm:overflow-visible">
      <div className={`flex min-w-0 ${signatureStrip === "none" ? "" : "gap-1"}`}>
        <table className={`flex-1 min-w-0 w-full table-fixed border-collapse ${insTableBorder}`}>
          <thead>
            <tr className="bg-neutral-50">
              <th
                className={`${insTableBorder} w-[6.75rem] px-2 py-3 print:py-1 text-left text-xs font-bold uppercase tracking-wide text-neutral-900`}
              >
                TIME
              </th>
              {INS_DAYS.map((day) => (
                <th
                  key={day}
                  className={`${insTableBorder} px-2 py-3 print:py-1 text-center text-xs font-bold text-neutral-900`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INS_TIME_SLOTS.map((time, slotIdx) => (
              <tr key={time}>
                <td
                  className={`${insTableBorder} px-2 py-3 print:py-1 text-xs font-semibold text-neutral-900 whitespace-nowrap align-middle`}
                >
                  {time}
                </td>
                {INS_DAYS.map((day) => {
                  if (cellMode === "spanned" && "cellsByDay" in props) {
                    const pick = insPickSlotRender(day, slotIdx, props.cellsByDay[day], {
                      mondayPlaceholderSlot: props.showMondayPlaceholder,
                    });
                    if (pick.kind === "skip") {
                      return null;
                    }
                    if (pick.kind === "empty") {
                      return (
                        <td key={`${time}-${day}`} className={`${insTableBorder} p-0 align-middle`}>
                          <div
                            className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 print:py-1 text-center text-xs leading-snug text-neutral-900"
                            style={{ minHeight: "var(--ins-row-h)" }}
                          >
                            {pick.placeholder
                              ? props.renderSpanned({
                                  day,
                                  timeSlotLabel: time,
                                  slotIndex: slotIdx,
                                  rowSpan: 1,
                                  items: [],
                                  paperFormRow: true,
                                })
                              : null}
                          </div>
                        </td>
                      );
                    }
                    const { rowSpan, items } = pick;
                    return (
                      <td
                        key={`${time}-${day}`}
                        rowSpan={rowSpan}
                        className={`${insTableBorder} p-0 align-stretch`}
                      >
                        <div
                          className="flex h-full min-h-0 flex-col items-center justify-center gap-0.5 px-2 py-3 print:py-1 text-center text-xs leading-snug text-neutral-900"
                          style={{ minHeight: `calc(var(--ins-row-h) * ${rowSpan})` }}
                        >
                          {props.renderSpanned({
                            day,
                            timeSlotLabel: time,
                            slotIndex: slotIdx,
                            rowSpan,
                            items,
                          })}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={`${time}-${day}`} className={`${insTableBorder} p-0 align-middle`}>
                      <div
                        className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 print:py-1 text-center text-xs leading-snug text-neutral-900"
                        style={{ minHeight: "var(--ins-row-h)" }}
                      >
                        {"renderCell" in props ? props.renderCell(time, day) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {signatureStrip === "full" || signatureStrip === "campusOnly" ? (
          <InsSignatureStrip
            signatureSlots={signatureSlots}
            scheduleApproved={scheduleApproved}
            variant={signatureStrip === "campusOnly" ? "campusOnly" : "full"}
          />
        ) : null}
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

const FALLBACK_CAMPUS_ONLY: InsSignatureSlot[] = [
  { key: "campus", lineTitle: "Approved", lineSubtitle: "Campus Director", signerName: "—", imageUrl: null },
];

function InsSignatureStrip({
  signatureSlots,
  scheduleApproved,
  variant = "full",
}: {
  signatureSlots?: InsSignatureSlot[] | null;
  scheduleApproved: boolean;
  variant?: "full" | "campusOnly";
}) {
  const fallback = variant === "campusOnly" ? FALLBACK_CAMPUS_ONLY : FALLBACK_SLOTS;
  const slots = signatureSlots ?? fallback;
  // Keep the signature strip narrow (paper form style) — no big boxed placeholders.
  const colWidth = variant === "campusOnly" ? "w-[4.5rem]" : "w-[4.75rem]";

  return (
    <div className="hidden md:flex shrink-0 gap-0">
      {slots.map((s) => (
        <div
          key={s.key}
          className={`flex ${colWidth} flex-col items-stretch border border-neutral-900 border-l-0 bg-white first:border-l`}
        >
          <div className="flex-1 flex flex-col items-center justify-between px-1 py-2">
            <div className="text-[9px] font-semibold leading-tight text-neutral-900" style={vLabel}>
              {s.lineTitle}
            </div>
            <div className="w-full pt-2 pb-1">
              <div className="min-h-[3.25rem] flex items-end justify-center">
                {scheduleApproved && s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded public URLs
                  <img src={s.imageUrl} alt="" className="max-h-12 w-full object-contain object-bottom" />
                ) : null}
              </div>
              <div className="border-b border-neutral-900" />
              <div className="mt-1 text-center text-[8px] leading-tight text-neutral-700">{s.lineSubtitle}</div>
              {scheduleApproved && s.signerName ? (
                <div className="mt-0.5 text-center text-[8px] font-medium leading-tight text-neutral-900 line-clamp-2">
                  {s.signerName}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
