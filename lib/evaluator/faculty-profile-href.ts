/** `/chairman/ins` → `/chairman/faculty-profile` (same for `/admin/college`, `/doi`, `/admin/gec`). */
export function facultyProfileHrefForInsBase(insBasePath: string | null | undefined): string {
  const base = (insBasePath ?? "").split("?")[0].replace(/\/ins\/?$/, "");
  return `${base || "/chairman"}/faculty-profile`;
}
