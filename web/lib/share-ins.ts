export async function shareInsView(view: "faculty" | "section" | "room") {
  const map = {
    faculty: "INS 5A (Faculty)",
    section: "INS 5B (Section)",
    room: "INS 5C (Room)",
  } as const;

  const res = await fetch("/api/inbox/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subject: `INS Form shared – ${map[view]}`,
      body: `This is a simulated share to College Admin for ${map[view]}.`,
      view,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to share");
  }
}
