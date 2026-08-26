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
};

const ProgramModeContext = createContext<ProgramModeContextValue | null>(null);

function ProgramModeProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [programMode, setModeState] = useState<ProgramMode>(DEFAULT_PROGRAM_MODE);

  useEffect(() => {
    const raw = searchParams.get("programMode");
    if (raw === "day" || raw === "night") {
      const parsed = parseProgramMode(raw);
      setModeState(parsed);
      writeStoredProgramMode(parsed);
      return;
    }
    setModeState(readStoredProgramMode());
  }, [searchParams]);

  const setProgramMode = useCallback(
    (mode: ProgramMode) => {
      setModeState(mode);
      writeStoredProgramMode(mode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("programMode", mode);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({
      programMode,
      setProgramMode,
      label: programModeLabel(programMode),
    }),
    [programMode, setProgramMode],
  );

  return <ProgramModeContext.Provider value={value}>{children}</ProgramModeContext.Provider>;
}

export function ProgramModeProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProgramModeProviderInner>{children}</ProgramModeProviderInner>
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
    };
  }
  return ctx;
}

export function useProgramModeOptional(): ProgramModeContextValue | null {
  return useContext(ProgramModeContext);
}
