"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { InsTimedCell } from "@/lib/ins/ins-weekly-grid-span";
import { insPickSlotRender } from "@/lib/ins/ins-weekly-grid-span";
import { insPrintedSignatureLines } from "@/lib/ins/ins-pdf-adapters";
import {
  insTimeSlotLabel,
  isNightCellClosed,
  slotsForSession,
} from "@/lib/scheduling/program-session";
import { INS_DAYS } from "./opticore-ins-constants";

const insTableBorder = "border border-neutral-900";

/** Visible width of the signature rail beside the schedule (matches PDF RAIL_W). */
const RAIL_W_PX = 100;

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
 * Order (left→right after rotation): Prepared by → Reviewed & Certified → Approved.
 */
export function OpticoreInsScheduleTableWithSignatures(props: Props) {
  const {
    signatureSlots,
    scheduleApproved = false,
    signatureStrip = "full",
    compactSignaturePrint = false,
  } = props;
  const cellMode = props.cellMode ?? "legacy";
  // Day Program paper forms always print Mon–Sun. Night uses OpticoreInsNightScheduleTable.
  const hourSlots = slotsForSession("day");
  const days = INS_DAYS;

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div
        className={`flex min-w-0 flex-row flex-nowrap items-stretch ${signatureStrip === "none" ? "" : "gap-0"}`}
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
                  const closed = isNightCellClosed("day", day, slot.startTime);
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
    lineTitle: "Approved:",
    lineSubtitle: "Campus Director",
    signerName: "—",
    imageUrl: null,
  },
];

/**
 * PDF `SignatureRail` equivalent for the on-page INS form:
 * build a **3-column × 2-row** strip (row1 = titles, row2 = name/line/role),
 * then rotate the whole strip -90° so it sits as a tall rail beside the grid.
 * No cell borders — only the signature underlines.
 */
export function InsSignatureStrip({
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
  const slots =
    variant === "campusOnly"
      ? (signatureSlots ?? FALLBACK_CAMPUS_ONLY)
      : signatureSlots
        ? insPrintedSignatureLines(signatureSlots)
        : FALLBACK_SLOTS;

  const railRef = useRef<HTMLDivElement>(null);
  const [railH, setRailH] = useState(320);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setRailH(h);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const railW = compactPrint ? 88 : RAIL_W_PX;
  const colCount = Math.max(1, slots.length);

  return (
    <div
      ref={railRef}
      className="relative ml-4 shrink-0 self-stretch overflow-visible print:ml-3"
      style={{ width: railW, minHeight: "18rem" }}
      aria-label="Signature rail"
    >
      {/*
        Unrotated layout = 3 cols × 2 rows:
          [ Prepared by: ] [ Reviewed… ] [ Approved: ]
          [ name / line  ] [ name/line ] [ name/line ]
        Then rotate -90° (same math as PDF SignatureRail).
      */}
      <div
        className="absolute grid"
        style={{
          width: railH,
          height: railW,
          top: railH / 2 - railW / 2,
          left: -(railH / 2 - railW / 2),
          transform: "rotate(-90deg)",
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gridTemplateRows: "auto 1fr",
        }}
      >
        {/* Row 1 — titles */}
        {slots.map((s) => (
          <div
            key={`title-${s.key}`}
            className="flex items-start justify-center px-2 pt-1 text-center"
          >
            <span
              className={`font-semibold leading-tight text-neutral-900 ${
                compactPrint ? "text-[8px] print:text-[6.5pt]" : "text-[9px]"
              }`}
            >
              {s.lineTitle}
            </span>
          </div>
        ))}

        {/* Row 2 — signature / name / underline / role */}
        {slots.map((s) => (
          <div
            key={`sig-${s.key}`}
            className="flex flex-col items-center justify-end px-2 pb-1 text-center"
          >
            {scheduleApproved && s.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded public URLs
              <img
                src={s.imageUrl}
                alt=""
                className={`mb-0.5 object-contain ${
                  compactPrint ? "max-h-7 max-w-[4.5rem]" : "max-h-9 max-w-[5.5rem]"
                }`}
              />
            ) : (
              <div className={compactPrint ? "h-4" : "h-6"} aria-hidden />
            )}
            {s.signerName && s.signerName !== "—" ? (
              <span
                className={`max-w-full truncate font-bold leading-tight text-neutral-900 ${
                  compactPrint ? "text-[7px] print:text-[5.5pt]" : "text-[8px]"
                }`}
              >
                {s.signerName}
              </span>
            ) : null}
            <div
              className="my-0.5 border-b border-neutral-900"
              style={{ width: Math.max(48, railH / colCount - 24) }}
            />
            <span
              className={`max-w-full leading-tight text-neutral-800 ${
                compactPrint ? "text-[7px] print:text-[5.5pt]" : "text-[8px]"
              }`}
            >
              {s.lineSubtitle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
