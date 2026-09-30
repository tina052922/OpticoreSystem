import { redirect } from "next/navigation";

/**
 * The faculty Load Generator now lives under My schedule.
 *
 * This is a redirect rather than a deleted route for two reasons: bookmarks and the
 * `/faculty/ins/{faculty,section,room}` shortcuts that already redirect here, and — the reason that
 * matters — the page it replaced browsed the whole college. Its section and room views listed every
 * colleague who shared a section or a room. Leaving it reachable would keep that door open beside
 * the filtered one.
 */
export default async function FacultyInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const requested = typeof sp.tab === "string" ? sp.tab : undefined;
  const tab = requested === "section" || requested === "room" ? requested : "faculty";
  redirect(`/faculty/schedule?tab=${tab}`);
}
