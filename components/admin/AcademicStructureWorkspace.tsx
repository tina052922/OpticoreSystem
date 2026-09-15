"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { academicStructureApi, apiFetch, ApiClientError } from "@/lib/api/client";
import type { College, Program, Section } from "@/types/db";

export type AcademicStructureWorkspaceProps = {
  /** When set (College Admin), lock to that college and hide Add College. */
  lockedCollegeId?: string | null;
  /** DOI can create/delete colleges; College Admin cannot. */
  canManageColleges?: boolean;
};

function programYearCount(p: Program): number {
  const n = p.yearCount;
  if (typeof n === "number" && n >= 1 && n <= 6) return n;
  return 4;
}

export function AcademicStructureWorkspace({
  lockedCollegeId = null,
  canManageColleges = false,
}: AcademicStructureWorkspaceProps) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(lockedCollegeId);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | null>(null);

  const [collegeCode, setCollegeCode] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [savingCollege, setSavingCollege] = useState(false);

  const [programCode, setProgramCode] = useState("");
  const [programName, setProgramName] = useState("");
  const [programYears, setProgramYears] = useState("4");
  const [savingProgram, setSavingProgram] = useState(false);

  const [yearDraft, setYearDraft] = useState("4");
  const [savingYears, setSavingYears] = useState(false);

  const [sectionName, setSectionName] = useState("");
  const [sectionStudents, setSectionStudents] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (lockedCollegeId) setSelectedCollegeId(lockedCollegeId);
  }, [lockedCollegeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        apiFetch<{ colleges: College[] }>("/api/catalog/colleges", { method: "GET" }),
        apiFetch<{ programs: Program[] }>("/api/catalog/programs", { method: "GET" }),
      ]);
      const nextColleges = lockedCollegeId
        ? (cRes.colleges ?? []).filter((c) => c.id === lockedCollegeId)
        : (cRes.colleges ?? []);
      const nextPrograms = lockedCollegeId
        ? (pRes.programs ?? []).filter((p) => p.collegeId === lockedCollegeId)
        : (pRes.programs ?? []);
      setColleges(nextColleges);
      setPrograms(nextPrograms);

      if (lockedCollegeId) {
        setSelectedCollegeId((prev) => prev || lockedCollegeId);
      }

      const programIds = nextPrograms.map((p) => p.id);
      if (programIds.length === 0) {
        setSections([]);
        return;
      }
      const sRes = await apiFetch<{ sections: Section[] }>(
        `/api/catalog/sections?programId=${encodeURIComponent(programIds.join(","))}`,
        { method: "GET" },
      );
      setSections(sRes.sections ?? []);
    } catch (e) {
      setError(e instanceof ApiClientError || e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [lockedCollegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === selectedCollegeId) ?? null,
    [colleges, selectedCollegeId],
  );

  const collegePrograms = useMemo(
    () => programs.filter((p) => p.collegeId === selectedCollegeId),
    [programs, selectedCollegeId],
  );

  const selectedProgram = useMemo(
    () => collegePrograms.find((p) => p.id === selectedProgramId) ?? null,
    [collegePrograms, selectedProgramId],
  );

  const yearLevels = useMemo(() => {
    if (!selectedProgram) return [];
    const n = programYearCount(selectedProgram);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [selectedProgram]);

  const yearSections = useMemo(() => {
    if (!selectedProgramId || selectedYearLevel == null) return [];
    return sections
      .filter((s) => s.programId === selectedProgramId && s.yearLevel === selectedYearLevel)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, selectedProgramId, selectedYearLevel]);

  useEffect(() => {
    if (!selectedProgram) {
      setYearDraft("4");
      return;
    }
    setYearDraft(String(programYearCount(selectedProgram)));
  }, [selectedProgram]);

  useEffect(() => {
    if (!selectedProgramId) {
      setSelectedYearLevel(null);
      return;
    }
    if (selectedYearLevel != null && yearLevels.includes(selectedYearLevel)) return;
    setSelectedYearLevel(yearLevels[0] ?? null);
  }, [selectedProgramId, yearLevels, selectedYearLevel]);

  function flashOk(msg: string) {
    setSuccess(msg);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3500);
  }

  async function handleCreateCollege() {
    if (!canManageColleges) return;
    setSavingCollege(true);
    setError(null);
    setWarning(null);
    try {
      const { college } = await academicStructureApi.createCollege({
        code: collegeCode.trim(),
        name: collegeName.trim(),
      });
      setCollegeCode("");
      setCollegeName("");
      await load();
      setSelectedCollegeId(college.id);
      setSelectedProgramId(null);
      flashOk(`College ${college.code} added`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add college");
    } finally {
      setSavingCollege(false);
    }
  }

  async function handleSaveCollegeEdit(college: College, code: string, name: string) {
    setError(null);
    try {
      await academicStructureApi.updateCollege(college.id, { code, name });
      setEditingCollegeId(null);
      await load();
      flashOk("College updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update college");
    }
  }

  async function handleDeleteCollege(id: string) {
    if (!canManageColleges) return;
    if (!window.confirm("Delete this college? Programs must be removed first.")) return;
    setError(null);
    try {
      await academicStructureApi.deleteCollege(id);
      if (selectedCollegeId === id) {
        setSelectedCollegeId(lockedCollegeId);
        setSelectedProgramId(null);
      }
      await load();
      flashOk("College deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete college");
    }
  }

  async function handleCreateProgram() {
    if (!selectedCollegeId) return;
    setSavingProgram(true);
    setError(null);
    setWarning(null);
    try {
      const res = await academicStructureApi.createProgram({
        collegeId: selectedCollegeId,
        code: programCode.trim(),
        name: programName.trim(),
        yearCount: Math.min(6, Math.max(1, parseInt(programYears, 10) || 4)),
      });
      if (res.warning) setWarning(res.warning);
      setProgramCode("");
      setProgramName("");
      setProgramYears("4");
      await load();
      setSelectedProgramId(res.program.id);
      flashOk(`Program ${res.program.code} added`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add program");
    } finally {
      setSavingProgram(false);
    }
  }

  async function handleSaveProgramEdit(program: Program, code: string, name: string) {
    setError(null);
    try {
      await academicStructureApi.updateProgram(program.id, { code, name });
      setEditingProgramId(null);
      await load();
      flashOk("Program updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update program");
    }
  }

  async function handleDeleteProgram(id: string) {
    if (!window.confirm("Delete this program? Sections must be removed first.")) return;
    setError(null);
    try {
      await academicStructureApi.deleteProgram(id);
      if (selectedProgramId === id) setSelectedProgramId(null);
      await load();
      flashOk("Program deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete program");
    }
  }

  async function handleSaveYears() {
    if (!selectedProgram) return;
    setSavingYears(true);
    setError(null);
    setWarning(null);
    try {
      const yearCount = Math.min(6, Math.max(1, parseInt(yearDraft, 10) || 4));
      const res = await academicStructureApi.updateProgram(selectedProgram.id, { yearCount });
      if (res.warning) setWarning(res.warning);
      await load();
      flashOk(`Years set to ${yearCount}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set years");
    } finally {
      setSavingYears(false);
    }
  }

  async function handleCreateSection() {
    if (!selectedProgramId || selectedYearLevel == null) return;
    setSavingSection(true);
    setError(null);
    try {
      await academicStructureApi.createSection({
        programId: selectedProgramId,
        name: sectionName.trim(),
        yearLevel: selectedYearLevel,
        studentCount: Math.max(0, parseInt(sectionStudents, 10) || 0),
      });
      setSectionName("");
      setSectionStudents("");
      await load();
      flashOk("Section added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add section");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleSaveSectionEdit(
    section: Section,
    name: string,
    studentCount: number,
    yearLevel: number,
  ) {
    setError(null);
    try {
      await academicStructureApi.updateSection(section.id, { name, studentCount, yearLevel });
      setEditingSectionId(null);
      await load();
      flashOk("Section updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update section");
    }
  }

  async function handleDeleteSection(id: string) {
    if (!window.confirm("Delete this section?")) return;
    setError(null);
    try {
      await academicStructureApi.deleteSection(id);
      await load();
      flashOk("Section deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete section");
    }
  }

  return (
    <div className="px-4 md:px-8 pb-12 max-w-5xl space-y-6">
      <p className="text-sm text-black/65 leading-relaxed">
        Creation order: <strong>College</strong> → <strong>Program</strong> → set{" "}
        <strong>years</strong> → <strong>Section</strong> under a year. Each step unlocks the next.
      </p>

      {loading ? <p className="text-sm text-black/50">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : null}
      {warning ? (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {warning}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {success}
        </p>
      ) : null}

      {/* 1. Colleges */}
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-black">1. Colleges</h2>
          <p className="text-sm text-black/60 mt-1">
            {canManageColleges
              ? "Add a college before programs."
              : "Your college is fixed. Programs and sections are managed below."}
          </p>
        </div>

        {canManageColleges ? (
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs text-black/70">
              Code
              <Input
                className="mt-1 w-28"
                value={collegeCode}
                onChange={(e) => setCollegeCode(e.target.value)}
                placeholder="COTE"
              />
            </label>
            <label className="text-xs text-black/70 flex-1 min-w-[180px]">
              Name
              <Input
                className="mt-1"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="College of Technology and Engineering"
              />
            </label>
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={savingCollege || !collegeCode.trim() || !collegeName.trim()}
              onClick={() => void handleCreateCollege()}
            >
              {savingCollege ? "Adding…" : "Add College"}
            </Button>
          </div>
        ) : null}

        <ul className="divide-y divide-black/5 border border-black/10 rounded-lg overflow-hidden">
          {colleges.length === 0 ? (
            <li className="px-3 py-4 text-sm text-black/50">No colleges yet.</li>
          ) : (
            colleges.map((c) => {
              const active = c.id === selectedCollegeId;
              const editing = editingCollegeId === c.id;
              return (
                <li
                  key={c.id}
                  className={`px-3 py-2.5 flex flex-wrap items-center gap-2 ${
                    active ? "bg-amber-50/80" : "bg-white"
                  }`}
                >
                  {editing ? (
                    <CollegeEditRow
                      college={c}
                      onCancel={() => setEditingCollegeId(null)}
                      onSave={(code, name) => void handleSaveCollegeEdit(c, code, name)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-left flex-1 min-w-[140px]"
                        onClick={() => {
                          setSelectedCollegeId(c.id);
                          setSelectedProgramId(null);
                        }}
                      >
                        <span className="font-semibold text-[#780301]">{c.code}</span>
                        <span className="text-sm text-black/80 ml-2">{c.name}</span>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCollegeId(c.id)}
                      >
                        Edit
                      </Button>
                      {canManageColleges ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-800"
                          onClick={() => void handleDeleteCollege(c.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* 2. Programs */}
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-black">2. Programs</h2>
          <p className="text-sm text-black/60 mt-1">
            {selectedCollege
              ? `Under ${selectedCollege.code} — ${selectedCollege.name}`
              : "Select a college first."}
          </p>
        </div>

        {selectedCollegeId ? (
          <>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-black/70">
                Code
                <Input
                  className="mt-1 w-28"
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                  placeholder="BSIT"
                />
              </label>
              <label className="text-xs text-black/70 flex-1 min-w-[180px]">
                Name
                <Input
                  className="mt-1"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Bachelor of Science in Information Technology"
                />
              </label>
              <label className="text-xs text-black/70">
                Years
                <Input
                  className="mt-1 w-20"
                  type="number"
                  min={1}
                  max={6}
                  value={programYears}
                  onChange={(e) => setProgramYears(e.target.value)}
                />
              </label>
              <Button
                type="button"
                className="bg-[#780301] hover:bg-[#5a0201] text-white"
                disabled={savingProgram || !programCode.trim() || !programName.trim()}
                onClick={() => void handleCreateProgram()}
              >
                {savingProgram ? "Adding…" : "Add Program"}
              </Button>
            </div>

            <ul className="divide-y divide-black/5 border border-black/10 rounded-lg overflow-hidden">
              {collegePrograms.length === 0 ? (
                <li className="px-3 py-4 text-sm text-black/50">No programs in this college yet.</li>
              ) : (
                collegePrograms.map((p) => {
                  const active = p.id === selectedProgramId;
                  const editing = editingProgramId === p.id;
                  return (
                    <li
                      key={p.id}
                      className={`px-3 py-2.5 flex flex-wrap items-center gap-2 ${
                        active ? "bg-amber-50/80" : "bg-white"
                      }`}
                    >
                      {editing ? (
                        <ProgramEditRow
                          program={p}
                          onCancel={() => setEditingProgramId(null)}
                          onSave={(code, name) => void handleSaveProgramEdit(p, code, name)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-left flex-1 min-w-[140px]"
                            onClick={() => setSelectedProgramId(p.id)}
                          >
                            <span className="font-semibold text-[#780301]">{p.code}</span>
                            <span className="text-sm text-black/80 ml-2">{p.name}</span>
                            <span className="text-xs text-black/45 ml-2">
                              · {programYearCount(p)} yr
                            </span>
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProgramId(p.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-800"
                            onClick={() => void handleDeleteProgram(p.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </>
        ) : (
          <p className="text-sm text-black/45">Select a college above to add programs.</p>
        )}
      </section>

      {/* 3. Years */}
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-black">3. Years</h2>
          <p className="text-sm text-black/60 mt-1">
            {selectedProgram
              ? `How many year levels for ${selectedProgram.code}?`
              : "Select a program first."}
          </p>
        </div>

        {selectedProgram ? (
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs text-black/70">
              Number of years (1–6)
              <Input
                className="mt-1 w-28"
                type="number"
                min={1}
                max={6}
                value={yearDraft}
                onChange={(e) => setYearDraft(e.target.value)}
              />
            </label>
            <Button
              type="button"
              className="bg-[#FF990A] hover:bg-[#e88909] text-white"
              disabled={savingYears}
              onClick={() => void handleSaveYears()}
            >
              {savingYears ? "Saving…" : "Set years"}
            </Button>
            <div className="flex flex-wrap gap-1.5 w-full mt-1">
              {yearLevels.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYearLevel(y)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    selectedYearLevel === y
                      ? "bg-[#FF990A] text-white border-[#FF990A]"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Year {y}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-black/45">Select a program above to set years.</p>
        )}
      </section>

      {/* 4. Sections */}
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-black">4. Sections</h2>
          <p className="text-sm text-black/60 mt-1">
            {selectedProgram && selectedYearLevel != null
              ? `Under ${selectedProgram.code} · Year ${selectedYearLevel}`
              : "Select a program and year first."}
          </p>
        </div>

        {selectedProgram && selectedYearLevel != null ? (
          <>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-black/70 flex-1 min-w-[140px]">
                Section name
                <Input
                  className="mt-1"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder={`${selectedProgram.code}-${selectedYearLevel}A`}
                />
              </label>
              <label className="text-xs text-black/70">
                Students
                <Input
                  className="mt-1 w-24"
                  type="number"
                  min={0}
                  value={sectionStudents}
                  onChange={(e) => setSectionStudents(e.target.value)}
                  placeholder="40"
                />
              </label>
              <Button
                type="button"
                className="bg-[#780301] hover:bg-[#5a0201] text-white"
                disabled={savingSection || !sectionName.trim()}
                onClick={() => void handleCreateSection()}
              >
                {savingSection ? "Adding…" : "Add Section"}
              </Button>
            </div>

            <ul className="divide-y divide-black/5 border border-black/10 rounded-lg overflow-hidden">
              {yearSections.length === 0 ? (
                <li className="px-3 py-4 text-sm text-black/50">No sections for this year yet.</li>
              ) : (
                yearSections.map((s) => {
                  const editing = editingSectionId === s.id;
                  return (
                    <li key={s.id} className="px-3 py-2.5 flex flex-wrap items-center gap-2">
                      {editing ? (
                        <SectionEditRow
                          section={s}
                          maxYear={programYearCount(selectedProgram)}
                          onCancel={() => setEditingSectionId(null)}
                          onSave={(name, studentCount, yearLevel) =>
                            void handleSaveSectionEdit(s, name, studentCount, yearLevel)
                          }
                        />
                      ) : (
                        <>
                          <div className="flex-1 min-w-[120px]">
                            <span className="font-medium text-black">{s.name}</span>
                            <span className="text-xs text-black/45 ml-2">
                              {s.studentCount} students
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSectionId(s.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-800"
                            onClick={() => void handleDeleteSection(s.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </>
        ) : (
          <p className="text-sm text-black/45">Select a program and year above to add sections.</p>
        )}
      </section>
    </div>
  );
}

function CollegeEditRow({
  college,
  onCancel,
  onSave,
}: {
  college: College;
  onCancel: () => void;
  onSave: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState(college.code);
  const [name, setName] = useState(college.name);
  return (
    <div className="flex flex-wrap gap-2 items-center w-full">
      <Input className="w-24" value={code} onChange={(e) => setCode(e.target.value)} />
      <Input className="flex-1 min-w-[140px]" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="button" size="sm" onClick={() => onSave(code.trim(), name.trim())}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function ProgramEditRow({
  program,
  onCancel,
  onSave,
}: {
  program: Program;
  onCancel: () => void;
  onSave: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState(program.code);
  const [name, setName] = useState(program.name);
  return (
    <div className="flex flex-wrap gap-2 items-center w-full">
      <Input className="w-24" value={code} onChange={(e) => setCode(e.target.value)} />
      <Input className="flex-1 min-w-[140px]" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="button" size="sm" onClick={() => onSave(code.trim(), name.trim())}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function SectionEditRow({
  section,
  maxYear,
  onCancel,
  onSave,
}: {
  section: Section;
  maxYear: number;
  onCancel: () => void;
  onSave: (name: string, studentCount: number, yearLevel: number) => void;
}) {
  const [name, setName] = useState(section.name);
  const [students, setStudents] = useState(String(section.studentCount ?? 0));
  const [yearLevel, setYearLevel] = useState(String(section.yearLevel ?? 1));
  return (
    <div className="flex flex-wrap gap-2 items-center w-full">
      <Input className="flex-1 min-w-[120px]" value={name} onChange={(e) => setName(e.target.value)} />
      <select
        className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm"
        value={yearLevel}
        onChange={(e) => setYearLevel(e.target.value)}
      >
        {Array.from({ length: Math.max(1, maxYear) }, (_, i) => i + 1).map((y) => (
          <option key={y} value={String(y)}>
            Year {y}
          </option>
        ))}
      </select>
      <Input
        className="w-24"
        type="number"
        min={0}
        value={students}
        onChange={(e) => setStudents(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        onClick={() =>
          onSave(
            name.trim(),
            Math.max(0, parseInt(students, 10) || 0),
            Math.min(maxYear, Math.max(1, parseInt(yearLevel, 10) || 1)),
          )
        }
      >
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
