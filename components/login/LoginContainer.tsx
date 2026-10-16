"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";

/** Falls back to the bundled seal when an admin-uploaded logo fails to load. */
function onLogoError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (!el.src.includes("ctu-logo.svg")) el.src = "/login/ctu-logo.svg";
}

type LoginContainerProps = {
  children: ReactNode;
  /**
   * A roomier card, for a form that needs side-by-side fields.
   *
   * Instructor registration puts last, first and middle name in one row; at the default width those
   * three share about 350px and every placeholder truncates.
   */
  width?: "default" | "wide";
};

/**
 * The shell behind every signed-out page: sign in, register, verify, reset.
 *
 * The campus photograph used to be an empty panel while each form carried its own 144px seal and a
 * repeat of the university name — so the branding was both missing where there was room for it and
 * duplicated where there was not. It lives here now, once, which lets the forms start at their
 * first field instead of a third of the way down the card.
 *
 * On a wide screen the shell is exactly one viewport and does not scroll; the form column scrolls
 * inside it, so the brand panel stays put however long the form gets. Letting the whole page scroll
 * instead gave the panel the height of the entire document — on the register page, far taller than
 * the screen — and it centred its contents in the middle of *that*, pushing the mark below the fold.
 * Below `lg` the panel is a band at the top and the page scrolls normally, as a phone expects.
 */
export function LoginContainer({ children, width = "default" }: LoginContainerProps) {
  const branding = useCampusBranding();
  const cardWidth = width === "wide" ? "max-w-[34rem]" : "max-w-[26rem]";

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#f6f5f4] lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* ── brand panel: a band on small screens, a fixed half-page on large ── */}
      <aside className="relative isolate h-40 w-full shrink-0 overflow-hidden sm:h-48 lg:h-full lg:w-[48%] xl:w-[52%]">
        <Image
          src="/ctu-ac-bg.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="-z-20 object-cover object-[60%_center]"
        />
        {/*
          Two passes. The horizontal one carries the side the text sits on; the vertical one keeps
          the top and bottom edges readable where the photograph is at its brightest — pale sky
          above, sunlit grass below. One gradient could not do both without flattening the picture.
        */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/40 to-black/45 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/55 lg:to-black/20"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hidden bg-gradient-to-t from-black/60 via-transparent to-black/35 lg:block"
        />

        <Link
          href="/"
          className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white sm:left-7 sm:top-7 lg:left-10 lg:top-10 lg:text-sm xl:left-14 xl:top-14"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to home
        </Link>

        {/*
          One optical group, vertically centred. Spreading the mark, the name and a tagline to the
          top, middle and bottom of the panel left each stranded on its own patch of photograph.
        */}
        {/* Top padding clears the pinned link on the band; the tall panel centres on its own. */}
        <div className="flex h-full w-full items-center px-5 pb-5 pt-14 sm:px-7 sm:pt-16 lg:px-10 lg:py-10 xl:px-14">
          <div className="flex min-w-0 items-center gap-3.5 lg:block">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-white/25 lg:h-20 lg:w-20">
              {/* eslint-disable-next-line no-restricted-syntax -- may be an admin-uploaded remote URL */}
              <img
                src={branding.logoUrl || CTU_LOGO_PNG}
                alt=""
                width={160}
                height={160}
                className="h-full w-full scale-105 object-contain"
                onError={onLogoError}
              />
            </span>

            <div className="min-w-0 lg:mt-7">
              <p className="truncate text-xl font-bold leading-none tracking-tight text-white lg:text-5xl xl:text-6xl">
                {branding.headerTitle}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-white/90 lg:mt-3 lg:text-xl xl:text-2xl">
                Campus Intelligence System
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/65 lg:mt-2 lg:text-sm">
                {branding.universityName} · Argao Campus
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── form panel ── */}
      {/*
        The scroll container is `main`; the centring lives on the wrapper inside it. Centring a
        flex child directly in a scrolling box clips the top of anything taller than the box, and
        the clipped part cannot be scrolled back to — on a long register form that would hide the
        first field. `min-h-full` centres a short form and simply grows for a long one.
      */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-8 sm:py-12 lg:py-16">
          <div
            className={`w-full ${cardWidth} rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] sm:p-8`}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
