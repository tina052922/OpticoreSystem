import { describe, expect, it } from "vitest";
import { buildInsSectionView } from "./build-ins-section-view";
import { filterByProgramMode } from "@/lib/scheduling/program-mode";
import type { FacultyProfile, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

describe("buildInsSectionView", () => {
  it("shows Evening Program rows after selecting the night mode", () => {
    const entries: ScheduleEntry[] = [
      {
        id: "day-entry",
        academicPeriodId: "term-1",
        subjectId: "day-subject",
        instructorId: "faculty-1",
        sectionId: "day-section",
        roomId: "room-1",
        day: "Monday",
        startTime: "08:00",
        endTime: "10:00",
        status: "draft",
        programMode: "day",
      },
      {
        id: "night-entry",
        academicPeriodId: "term-1",
        subjectId: "night-subject",
        instructorId: "faculty-1",
        sectionId: "night-section",
        roomId: "room-1",
        day: "Monday",
        startTime: "18:00",
        endTime: "20:00",
        status: "draft",
        programMode: "night",
      },
    ];
    const nightSection: Section = {
      id: "night-section",
      programId: "program-1",
      name: "BSIT-1E",
      yearLevel: 1,
      studentCount: 30,
      programMode: "night",
    };
    const nightSubject: Subject = {
      id: "night-subject",
      code: "IT-101E",
      subcode: null,
      title: "Evening Computing",
      lecUnits: 2,
      lecHours: 2,
      labUnits: 0,
      labHours: 0,
      programId: "program-1",
      yearLevel: 1,
      semester: 1,
    };
    const room: Room = {
      id: "room-1",
      code: "Room 1",
      building: null,
      floor: null,
      capacity: 30,
      type: null,
      collegeId: "college-1",
    };
    const instructor: User = {
      id: "faculty-1",
      employeeId: null,
      email: "faculty@example.edu",
      name: "Instructor",
      role: "instructor",
      collegeId: "college-1",
      createdAt: "",
      updatedAt: "",
    };

    const view = buildInsSectionView({
      entries: filterByProgramMode(entries, "night"),
      academicPeriodId: "term-1",
      sectionId: nightSection.id,
      sectionById: new Map([[nightSection.id, nightSection]]),
      subjectById: new Map([[nightSubject.id, nightSubject]]),
      roomById: new Map([[room.id, room]]),
      userById: new Map([[instructor.id, instructor]]),
      facultyProfileByUserId: new Map<string, Pick<FacultyProfile, "fullName">>(),
    });

    expect(view.schedule.Monday).toHaveLength(1);
    expect(view.schedule.Monday[0]?.course).toBe("IT-101E");
    expect(view.courses.map((course) => course.code)).toEqual(["IT-101E"]);
  });
});
