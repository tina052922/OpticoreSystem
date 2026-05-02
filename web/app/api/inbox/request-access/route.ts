import { NextResponse } from "next/server";

/**
 * Legacy entry point: forwards to POST /api/access-requests with GEC vacant scope.
 * Prefer calling /api/access-requests directly with full scope list.
 */
export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as { note?: string; targetCollegeId?: string } | null;
  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/access-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      scopes: ["gec_vacant_slots"],
      note: json?.note?.trim() || "Request via legacy inbox endpoint.",
      targetCollegeId: json?.targetCollegeId?.trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
