import type { ReactNode } from "react";

/**
 * The title block at the top of a signed-out form.
 *
 * Each form used to write its own, and they had drifted: a 144px seal here, a 112px one there, the
 * university name repeated at three different weights and sizes. The branding now sits once in the
 * panel beside the form, so this is only what the person is here to do.
 */
export function AuthFormHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#181818]">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-black/55">{subtitle}</p> : null}
    </header>
  );
}
