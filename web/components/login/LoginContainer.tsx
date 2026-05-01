import type { ReactNode } from "react";

type LoginContainerProps = {
  children: ReactNode;
};

/**
 * Split-screen login shell: maroon-tinted campus visual (left) + white panel (right).
 * Logo and copy live in `children` (e.g. LoginClient).
 */
export function LoginContainer({ children }: LoginContainerProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#3d0a08]">
      {/**
       * Mobile: show full campus photo above the form (left column is `lg` only).
       * Desktop: split panel — `object-contain` keeps the whole building in frame (cover was cropping).
       */}
      <div
        className="lg:hidden relative w-full min-h-[220px] max-h-[38vh] shrink-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#3d0a08]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
        <img
          src="/login/campus-photo.png"
          alt=""
          className="relative z-[1] w-full h-full max-h-[38vh] object-contain object-center"
        />
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(120, 3, 1, 0.55) 0%, rgba(120, 3, 1, 0.25) 50%, rgba(120, 3, 1, 0.45) 100%)",
          }}
        />
      </div>

      {/* Left (lg+): campus imagery + maroon overlay */}
      <div
        className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative min-h-[280px] lg:min-h-screen overflow-hidden rounded-br-[24px] shrink-0"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#3d0a08]" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
          <img
            src="/login/campus-photo.png"
            alt=""
            className="max-h-full max-w-full w-auto h-auto object-contain object-center"
          />
        </div>
        {/* Translucent maroon wash — darker at top, lighter toward bottom */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(120, 3, 1, 0.72) 0%, rgba(120, 3, 1, 0.45) 45%, rgba(180, 40, 30, 0.35) 100%)",
          }}
        />
      </div>

      {/* Right: white panel with optional faint building watermark at bottom */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16 min-h-screen overflow-y-auto bg-white">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[140%] max-w-4xl h-56 opacity-[0.07] bg-[url('/login/campus-photo.png')] bg-cover bg-center bg-no-repeat"
          />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 px-4 py-2 shadow-sm lg:bg-transparent lg:shadow-none lg:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
