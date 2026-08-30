"use client";

import type { ReactNode, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { hubCollegesListHref } from "@/lib/evaluator-central-hub";

type Props = {
  basePath: string;
  className?: string;
  children: ReactNode;
};

/**
 * Colleges / Back must drop `college` and `panel` query params.
 * Next.js `<Link>` on the same pathname can keep the previous search string and
 * loop Timetabling → Timetabling. This forces a replace to `?view=colleges` only.
 */
export function HubCollegesNavLink({ basePath, className, children }: Props) {
  const router = useRouter();
  const href = hubCollegesListHref(basePath);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    router.replace(href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
