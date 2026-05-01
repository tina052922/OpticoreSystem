import type { ReactNode } from "react";

type LoginContainerProps = {
  children: ReactNode;
};

/**
 * Split layout (reference UI): campus photo with brand tint on the left, light neutral form panel on the right.
 * On small viewports the photo is a top band so the building stays visible; `lg` matches the full split.
 */
export function LoginContainer({ children }: LoginContainerProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-neutral-950 lg:flex-row">
      <div className="relative h-44 w-full shrink-0 overflow-hidden lg:h-auto lg:min-h-screen lg:w-[52%]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
          <img
            src="/login/campus-photo.png"
            alt=""
            className="h-full w-full object-cover object-[78%_center] lg:object-center"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[#780301]/45 lg:rounded-r-[2rem] lg:bg-[#780301]/50"
          aria-hidden
        />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#F3F4F6] px-5 py-10 shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] sm:px-8 sm:py-12 lg:min-h-screen">
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-black/[0.06] bg-white px-5 py-7 shadow-xl sm:px-7 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
