import type { ReactNode } from "react";

type LoginContainerProps = {
  children: ReactNode;
};

/**
 * Split-screen login: full-bleed campus photo (left) + white sign-in panel (right).
 */
export function LoginContainer({ children }: LoginContainerProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/**
       * Mobile: campus photo band above the form.
       * Desktop: photo column fills the viewport edge-to-edge (no tint or maroon panel).
       */}
      <div className="lg:hidden relative w-full min-h-[min(42vh,320px)] shrink-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
        <img
          src="/login/campus-photo.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[78%_center]"
        />
      </div>

      <div className="hidden lg:block relative w-[55%] xl:w-[58%] min-h-screen shrink-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
        <img
          src="/login/campus-photo.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[78%_center]"
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16 min-h-screen overflow-y-auto bg-white">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[140%] max-w-4xl h-56 opacity-[0.06] bg-[url('/login/campus-photo.png')] bg-cover bg-center bg-no-repeat"
          />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 px-4 py-2 shadow-sm lg:bg-transparent lg:shadow-none lg:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
