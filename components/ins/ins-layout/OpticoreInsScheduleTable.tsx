import type { ReactNode } from "react";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { InsTimedCell } from "@/lib/ins/ins-weekly-grid-span";
import { insPickSlotRender } from "@/lib/ins/ins-weekly-grid-span";
import { insPrintedSignatureLines } from "@/lib/ins/ins-pdf-adapters";
import { useProgramSessionOptional } from "@/contexts/ProgramSessionContext";
import {
  insTimeSlotLabel,
  isNightCellClosed,
  slotsForSession,
  weekdaysForSession,
} from "@/lib/scheduling/program-session";
import { INS_DAYS } from "./opticore-ins-constants";

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
  /** Form 5B print: tighter vertical signature column so one-page bond layout is not clipped. */
  compactSignaturePrint?: boolean;
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
  const {
    signatureSlots,
    scheduleApproved = false,
    signatureStrip = "full",
    compactSignaturePrint = false,
  } = props;
  const cellMode = props.cellMode ?? "legacy";
  const programSession = useProgramSessionOptional()?.programSession ?? "day";
  const hourSlots = slotsForSession(programSession);
  const days = weekdaysForSession(programSession);

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div
        className={`flex min-w-0 ${signatureStrip === "none" ? "" : "gap-1"}`}
      >
        <table
          className={`w-full min-w-0 border-collapse ${insTableBorder}`}
        >
          <thead>
            <tr className="bg-neutral-50">
              <th
                className={`${insTableBorder} w-[7.5rem] px-1 py-2 print:py-0 print:px-0.5 print:text-[6.5pt] text-left text-[10px] font-bold uppercase tracking-wide text-neutral-900`}
              >
                TIME
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className={`${insTableBorder} px-1 py-2 print:py-1 print:px-1 print:text-[6.5pt] text-center text-[10px] font-bold text-neutral-900`}
                >
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourSlots.map((slot, slotIdx) => {
              const time = insTimeSlotLabel(slot);
              return (
              <tr key={`${slot.startTime}-${slot.endTime}`}>
                <td
                  className={`${insTableBorder} px-1 py-1 print:py-0 print:px-0.5 print:text-[6pt] text-[10px] font-semibold text-neutral-900 whitespace-nowrap align-middle`}
                >
                  {time}
                </td>
                {days.map((day) => {
                  const closed = isNightCellClosed(programSession, day, slot.startTime);
                  if (cellMode === "spanned" && "cellsByDay" in props) {
                    const pick = insPickSlotRender(
                      day as InsDay,
                      slotIdx,
                      props.cellsByDay[day as InsDay],
                      {
                        mondayPlaceholderSlot: props.showMondayPlaceholder,
                      },
                      hourSlots,
                    );
                    if (pick.kind === "skip") {
                      return null;
                    }
                    if (pick.kind === "empty") {
                      return (
                        <td
                          key={`${time}-${day}`}
                          className={`${insTableBorder} p-0 align-middle`}
                        >
                          <div
                            className="flex flex-col items-center justify-center gap-0 px-1 py-1 print:py-0 print:px-0.5 print:text-[6pt] text-center text-[10px] leading-tight text-neutral-900 overflow-hidden"
                            style={{ minHeight: "var(--ins-row-h)" }}
                          >
                            {closed ? (
                              <span className="text-[9px] italic text-neutral-400 print:text-[5.5pt]">Closed</span>
                            ) : pick.placeholder
                              ? props.renderSpanned({
                                  day: day as InsDay,
                                  timeSlotLabel: time,
                                  slotIndex: slotIdx,
                                  rowSpan: 1,
                                  items: [],
                                  paperFormRow: true,
                                })
                              : "\u00A0"}
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
                          className="flex h-full min-h-0 flex-col items-center justify-center gap-0 px-1 py-1 print:py-0 print:px-0.5 print:text-[6pt] text-center text-[10px] leading-tight text-neutral-900 overflow-hidden"
                          style={{
                            minHeight: `calc(var(--ins-row-h) * ${rowSpan})`,
                          }}
                        >
                          {props.renderSpanned({
                            day: day as InsDay,
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
                    <td
                      key={`${time}-${day}`}
                      className={`${insTableBorder} p-0 align-middle`}
                    >
                      <div
                        className="flex flex-col items-center justify-center gap-0 px-1 py-1 print:py-0 print:px-0.5 print:text-[6pt] text-center text-[10px] leading-tight text-neutral-900 overflow-hidden"
                        style={{ minHeight: "var(--ins-row-h)" }}
                      >
                        {closed ? (
                          <span className="text-[9px] italic text-neutral-400 print:text-[5.5pt]">Closed</span>
                        ) : "renderCell" in props
                          ? props.renderCell(time, day as InsDay)
                          : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
            })}
          </tbody>
        </table>

        {signatureStrip === "full" || signatureStrip === "campusOnly" ? (
          <InsSignatureStrip
            signatureSlots={signatureSlots}
            scheduleApproved={scheduleApproved}
            variant={signatureStrip === "campusOnly" ? "campusOnly" : "full"}
            compactPrint={compactSignaturePrint}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The three lines the paper form carries, in the PDF's order
 * (see `insPrintedSignatureLines`). Used when no resolved slots are supplied.
 */
const FALLBACK_SLOTS: InsSignatureSlot[] = insPrintedSignatureLines(null);

const FALLBACK_CAMPUS_ONLY: InsSignatureSlot[] = [
  {
    key: "campus",
    lineTitle: "Approved",
    lineSubtitle: "Campus Director",
    signerName: "—",
    imageUrl: null,
  },
];

function InsSignatureStrip({
  signatureSlots,
  scheduleApproved,
  variant = "full",
  compactPrint = false,
}: {
  signatureSlots?: InsSignatureSlot[] | null;
  scheduleApproved: boolean;
  variant?: "full" | "campusOnly";
  compactPrint?: boolean;
}) {
  // Form 5B prints a single Campus Director column; every other form prints the
  // same three lines as the PDF. `signatureSlots` arrives as the internal
  // six-slot strip, so it must be collapsed rather than rendered raw.
  const slots =
    variant === "campusOnly"
      ? (signatureSlots ?? FALLBACK_CAMPUS_ONLY)
      : signatureSlots
        ? insPrintedSignatureLines(signatureSlots)
        : FALLBACK_SLOTS;
  // Keep the signature strip narrow (paper form style) — no big boxed placeholders.
  const colWidth =
    variant === "campusOnly"
      ? compactPrint
        ? "w-[4rem]"
        : "w-[4.5rem]"
      : compactPrint
        ? "w-[4.25rem]"
        : "w-[4.75rem]";

  return (
    <div className="hidden shrink-0 gap-0 md:flex print:flex">
      {slots.map((s) => (
        <div
          key={s.key}
          className={`flex ${colWidth} flex-col items-stretch border border-neutral-900 border-l-0 bg-white first:border-l`}
        >
          <div
            className={`flex-1 flex flex-col items-center justify-between px-1 ${compactPrint ? "py-1 print:py-0.5 print:px-0.5" : "py-2"}`}
          >
            <div
              className={`font-semibold leading-tight text-neutral-900 ${compactPrint ? "text-[8px] print:text-[6.5pt]" : "text-[9px]"}`}
              style={vLabel}
            >
              {s.lineTitle}
            </div>
            <div
              className={`w-full ${compactPrint ? "pt-1 pb-0 print:pt-0.5" : "pt-2 pb-1"}`}
            >
              <div
                className={`flex items-end justify-center ${compactPrint ? "min-h-[2.5rem] print:min-h-[1.6rem]" : "min-h-[3.25rem]"}`}
              >
                {scheduleApproved && s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded public URLs
                  <img
                    src={s.imageUrl}
                    alt=""
                    className={`w-full object-contain object-bottom ${compactPrint ? "max-h-10 print:max-h-7" : "max-h-12"}`}
                  />
                ) : null}
              </div>
              <div className="border-b border-neutral-900" />
              <div
                className={`mt-1 text-center leading-tight text-neutral-700 ${compactPrint ? "text-[7px] print:text-[6pt]" : "text-[8px]"}`}
              >
                {s.lineSubtitle}
              </div>
              <div
                className={`mt-0.5 min-h-[0.9rem] text-center font-medium leading-tight text-neutral-900 line-clamp-2 ${compactPrint ? "text-[7px] print:text-[6pt]" : "text-[8px]"}`}
              >
                {s.signerName && s.signerName !== "—" ? (
                  s.signerName
                ) : (
                  <span className="font-normal text-neutral-400 print:text-neutral-500 print:block print:min-h-[0.65rem] print:border-b print:border-neutral-400">
                    {"\u00A0"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
