"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  readStoredProgramSession,
  writeStoredProgramSession,
  type ProgramSession,
} from "@/lib/scheduling/program-session";

type ProgramSessionContextValue = {
  programSession: ProgramSession;
  setProgramSession: (session: ProgramSession) => void;
};

const ProgramSessionContext = createContext<ProgramSessionContextValue | null>(null);

export function ProgramSessionProvider({ children }: { children: ReactNode }) {
  const [programSession, setSession] = useState<ProgramSession>(() => readStoredProgramSession());

  const setProgramSession = useCallback((session: ProgramSession) => {
    setSession(session);
    writeStoredProgramSession(session);
  }, []);

  const value = useMemo(
    () => ({ programSession, setProgramSession }),
    [programSession, setProgramSession],
  );

  return <ProgramSessionContext.Provider value={value}>{children}</ProgramSessionContext.Provider>;
}

export function useProgramSession(): ProgramSessionContextValue {
  const ctx = useContext(ProgramSessionContext);
  if (!ctx) {
    throw new Error("useProgramSession must be used within ProgramSessionProvider");
  }
  return ctx;
}

export function useProgramSessionOptional(): ProgramSessionContextValue | null {
  return useContext(ProgramSessionContext);
}
