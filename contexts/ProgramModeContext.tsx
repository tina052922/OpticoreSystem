"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  DEFAULT_PROGRAM_MODE,
  parseProgramMode,
  programModeLabel,
  readStoredProgramMode,
  writeStoredProgramMode,
  type ProgramMode,
} from "@/lib/scheduling/program-mode";

type ProgramModeContextValue = {
  programMode: ProgramMode;
  setProgramMode: (mode: ProgramMode) => void;
  label: string;
  /**
   * True when the viewer does not get to choose — their own programme decides it.
   *
   * A student belongs to one programme, day or evening, so switching modes would only ever show
   * them somebody else's timetable. The mode is fixed for them and {@link ProgramModeToggle}
   * renders nothing, which is what keeps the toggle out of every view at once instead of each one
   * having to remember to hide it.
   */
  locked: boolean;
};

const ProgramModeContext = createContext<ProgramModeContextValue | null>(null);

function ProgramModeProviderInner({
  children,
  lockedMode = null,
}: {
  children: ReactNode;
  lockedMode?: ProgramMode | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [programMode, setModeState] = useState<ProgramMode>(DEFAULT_PROGRAM_MODE);

  useEffect(() => {
    if (lockedMode) return;
    const raw = searchParams.get("programMode");
    if (raw === "day" || raw === "night") {
      const parsed = parseProgramMode(raw);
      setModeState(parsed);
      writeStoredProgramMode(parsed);
      return;
    }
    setModeState(readStoredProgramMode());
  }, [searchParams, lockedMode]);

  const setProgramMode = useCallback(
    (mode: ProgramMode) => {
      // A locked mode is not a default to be overridden; nothing may change it.
      if (lockedMode) return;
      setModeState(mode);
      writeStoredProgramMode(mode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("programMode", mode);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, lockedMode],
  );

  const effectiveMode = lockedMode ?? programMode;
  const value = useMemo(
    () => ({
      programMode: effectiveMode,
      setProgramMode,
      label: programModeLabel(effectiveMode),
      locked: Boolean(lockedMode),
    }),
    [effectiveMode, setProgramMode, lockedMode],
  );

  return <ProgramModeContext.Provider value={value}>{children}</ProgramModeContext.Provider>;
}

export function ProgramModeProvider({
  children,
  lockedMode = null,
}: {
  children: ReactNode;
  /** Fixes the mode for viewers who belong to one programme, e.g. a student. */
  lockedMode?: ProgramMode | null;
}) {
  return (
    <Suspense fallback={null}>
      <ProgramModeProviderInner lockedMode={lockedMode}>{children}</ProgramModeProviderInner>
    </Suspense>
  );
}

export function useProgramMode(): ProgramModeContextValue {
  const ctx = useContext(ProgramModeContext);
  if (!ctx) {
    return {
      programMode: DEFAULT_PROGRAM_MODE,
      setProgramMode: () => {},
      label: programModeLabel(DEFAULT_PROGRAM_MODE),
      locked: false,
    };
  }
  return ctx;
}

export function useProgramModeOptional(): ProgramModeContextValue | null {
  return useContext(ProgramModeContext);
}
