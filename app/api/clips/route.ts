import { NextRequest, NextResponse } from "next/server";
import { addClip } from "@/lib/store";
import { emitToTeachers } from "@/lib/socket-server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = formData.get("sessionId") as string;
  const eventId = formData.get("eventId") as string;
  const file = formData.get("clip") as File | null;

  if (!sessionId || !eventId || !file) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const filename = `${sessionId}-${eventId}-${Date.now()}.webm`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const clip = addClip(sessionId, eventId, filename, buffer);
  emitToTeachers("session:clip", { sessionId, clip });

  return NextResponse.json({ clip }, { status: 201 });
}

// Serve a stored clip by filename
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  // Import lazily to avoid circular dependency
  const { clipBuffers } = await import("@/lib/store");
  const buf = clipBuffers.get(filename);

  if (!buf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "video/webm",
      "Content-Length": buf.length.toString(),
    },
  });
}
