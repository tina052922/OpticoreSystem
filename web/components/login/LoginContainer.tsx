import type { ReactNode } from "react";

type LoginContainerProps = {
  children: ReactNode;
};

/**
 * Full-bleed campus photo behind a centered sign-in card (no maroon panel or color wash on the image).
 */
export function LoginContainer({ children }: LoginContainerProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
        <img
          src="/login/campus-photo.png"
          alt=""
          className="h-full min-h-screen w-full object-cover object-[78%_center]"
        />
      </div>
      <div className="relative z-10 w-full max-w-md px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/25 bg-white/95 px-5 py-7 shadow-xl backdrop-blur-sm sm:px-7 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
