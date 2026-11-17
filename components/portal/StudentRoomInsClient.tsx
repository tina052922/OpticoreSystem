"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { OpticoreInsForm5C } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { InsScheduleEntitySearch } from "@/components/ins/InsScheduleEntitySearch";
import { Button } from "@/components/ui/button";
import { PDFPreviewModal } from "@/components/pdf/preview/PDFPreviewModal";
import { INS5CDocument } from "@/components/pdf/forms/INS5CDocument";
import type { INS5CProps } from "@/components/pdf/types/insTypes";
import { roomScheduleToPdfGrid, signatureSlotsToPdf } from "@/lib/ins/ins-pdf-adapters";
import { resolveInsSignatureSlots } from "@/lib/ins/ins-signature-slots";
import { usePdfEmbeddedSignatureSlots } from "@/hooks/use-pdf-embedded-signature-slots";
import { buildInsRoomView, emptyInsRoomSchedule } from "@/lib/ins/build-ins-room-view";
import { insRoomLabel } from "@/lib/ins/ins-room-label";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { insPdfBrandingProps } from "@/lib/system-configuration/campus-branding";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { apiFetch } from "@/lib/api/client";
import type { College, FacultyProfile, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { ScheduleNotPublishedNotice } from "@/components/portal/ScheduleNotPublishedNotice";

type RoomRow = { id: string; code: string; displayName?: string | null; building?: string | null };

type RoomPayload = {
  rooms: RoomRow[];
  entries: ScheduleEntry[];
  sections?: Section[];
  subjects?: Subject[];
  instructors?: Pick<User, "id" | "name">[];
  facultyProfiles?: Pick<FacultyProfile, "userId" | "fullName">[];
  /** What the signature strip needs — the same inputs the staff INS forms resolve. */
  signers?: {
    college: College | null;
    programId: string | null;
    users: User[];
    campusDirectorSignatureImageUrl: string | null;
    doiSignatureImageUrl: string | null;
    insSignerDisplay: College["insSignerDisplay"] | null;
    published: boolean;
  };
  noSection?: boolean;
  notPublished?: boolean;
};

const ENDPOINT = "/api/portal/student-room-schedule";

/**
 * Student INS Forms Generator — By room (Form 5C).
 *
 * Pick a room by typing its name; the form shows every class in that room for the term selected in
 * the sidebar, read-only, with a printable PDF. The data comes from a student-only endpoint that
 * carries names only (no emails or IDs).
 */
export function StudentRoomInsClient() {
  const { selectedPeriodId, selectedPeriod, ready } = useSemesterFilter();
  const { programMode } = useProgramMode();
  const branding = useCampusBranding();

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [roomId, setRoomId] = useState("");
  const [data, setData] = useState<RoomPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const [noSection, setNoSection] = useState(false);
  const [notPublished, setNotPublished] = useState(false);

  // The rooms the student's own section uses in the selected term.
  useEffect(() => {
    if (!ready || !selectedPeriodId) return;
    let alive = true;
    setRoomId("");
    apiFetch<RoomPayload>(`${ENDPOINT}?periodId=${encodeURIComponent(selectedPeriodId)}`, { method: "GET" })
      .then((r) => {
        if (!alive) return;
        setRooms(r.rooms ?? []);
        setNoSection(Boolean(r.noSection));
        setNotPublished(Boolean(r.notPublished));
      })
      .catch((e: unknown) => alive && setErr(e instanceof Error ? e.message : "Could not load rooms."));
    return () => {
      alive = false;
    };
  }, [ready, selectedPeriodId]);

  // The chosen room's classes for the selected term and Day / Night mode.
  useEffect(() => {
    if (!ready || !selectedPeriodId || !roomId) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr(null);
    const qs = new URLSearchParams({ periodId: selectedPeriodId, roomId, programMode });
    apiFetch<RoomPayload>(`${ENDPOINT}?${qs.toString()}`, { method: "GET" })
      .then((r) => alive && setData(r))
      .catch((e: unknown) => alive && setErr(e instanceof Error ? e.message : "Could not load this room."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, selectedPeriodId, roomId, programMode]);

  const roomOptions = useMemo(
    () =>
      rooms
        .map((r) => {
          const name = insRoomLabel(r, r.code);
          const where = (r.building ?? "").trim();
          return { id: r.id, name: where ? `${name} — ${where}` : name };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rooms],
  );

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const roomLabel = selectedRoom ? insRoomLabel(selectedRoom, selectedRoom.code) : "—";
  const semesterLabel = selectedPeriod?.name ?? "—";

  const schedule = useMemo(() => {
    if (!data || !roomId || !selectedPeriodId) return emptyInsRoomSchedule();
    return buildInsRoomView({
      entries: data.entries ?? [],
      academicPeriodId: selectedPeriodId,
      roomId,
      sectionById: new Map((data.sections ?? []).map((x) => [x.id, x])),
      subjectById: new Map((data.subjects ?? []).map((x) => [x.id, x])),
      roomById: new Map(rooms.map((r) => [r.id, r as unknown as Room])),
      userById: new Map((data.instructors ?? []).map((u) => [u.id, u as User])),
      facultyProfileByUserId: new Map((data.facultyProfiles ?? []).map((p) => [p.userId, { fullName: p.fullName }])),
    }).schedule;
  }, [data, roomId, selectedPeriodId, rooms]);

  /** On screen: names always, signature images once the term is published (same rule as staff). */
  const signatureInputs = useMemo(() => {
    const sg = data?.signers;
    if (!sg) return null;
    return {
      college: sg.college,
      programId: sg.programId,
      users: sg.users ?? [],
      userById: new Map((sg.users ?? []).map((u) => [u.id, u])),
      scheduleApproved: sg.published,
      campusWideDirectorSignatureUrl: sg.campusDirectorSignatureImageUrl,
      doiSignatureImageUrl: sg.doiSignatureImageUrl,
      campusInsSignerDisplay: sg.insSignerDisplay ?? null,
      collegeInsSignerDisplay: sg.college?.insSignerDisplay ?? null,
    };
  }, [data?.signers]);
  const insSignatureSlots = useMemo(
    () => (signatureInputs ? resolveInsSignatureSlots(signatureInputs) : null),
    [signatureInputs],
  );
  // The PDF carries the configured signature images (as the staff Preview PDF does).
  const pdfSignatureSlotsRaw = useMemo(
    () => signatureSlotsToPdf(signatureInputs ? resolveInsSignatureSlots({ ...signatureInputs, includeImages: true }) : null),
    [signatureInputs],
  );
  const { slots: pdfSignatureSlots } = usePdfEmbeddedSignatureSlots(pdfSignatureSlotsRaw);
  const published = Boolean(data?.signers?.published);

  const classCount = useMemo(() => Object.values(schedule).reduce((n, day) => n + day.length, 0), [schedule]);

  const pdfData = useMemo(
    (): INS5CProps => ({
      roomAssignment: roomLabel,
      semesterLabel,
      schedule: roomScheduleToPdfGrid(schedule, programMode),
      signatureSlots: pdfSignatureSlots,
      programMode,
      ...insPdfBrandingProps(branding),
    }),
    [roomLabel, semesterLabel, schedule, pdfSignatureSlots, programMode, branding],
  );

  if (!ready || !selectedPeriodId) {
    return <p className="text-sm text-black/55 p-6">Loading academic term…</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
      <Link href="/student" className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black">
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">INS Forms Generator — By room</h1>
          <p className="text-gray-600 text-sm mt-1">
            INS Form 5C — the rooms your section uses in {semesterLabel}, with every class held there. Your own
            section&apos;s form is under My schedule.
            {loading ? <span className="ml-2 text-black/40">Updating…</span> : null}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 bg-white"
          onClick={() => setPdfOpen(true)}
          disabled={!roomId || loading || classCount === 0}
        >
          <Eye className="h-4 w-4" aria-hidden />
          Preview PDF
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <InsScheduleEntitySearch
          label="Room"
          placeholder="Type to search your rooms (e.g. IT Lab 04)"
          options={roomOptions}
          selectedId={roomId}
          onSelectedIdChange={setRoomId}
          disabled={rooms.length === 0}
          listId="student-ins-room-list"
        />
      </div>

      {err ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{err}</div> : null}

      {notPublished ? (
        <ScheduleNotPublishedNotice />
      ) : !roomId ? (
        <div className="rounded-lg border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-black/50">
          {noSection
            ? "No section is on file for you yet — set it under Profile to see your rooms."
            : rooms.length === 0
              ? `Your section has no rooms scheduled for ${semesterLabel} yet.`
              : `Type one of your ${rooms.length} room${rooms.length === 1 ? "" : "s"} above to see its schedule.`}
        </div>
      ) : (
        <>
          {!loading && classCount === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
              No classes are scheduled in {roomLabel} for {semesterLabel}.
            </div>
          ) : null}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
            <OpticoreInsForm5C
              roomAssignment={roomLabel}
              schedule={schedule}
              scheduleApproved={published}
              insSignatureSlots={insSignatureSlots}
              readOnly
              semesterLabel={semesterLabel}
            />
          </div>
        </>
      )}

      <PDFPreviewModal
        filename={`INS-5C-${roomLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`}
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        document={<INS5CDocument data={pdfData} />}
      />
    </div>
  );
}
