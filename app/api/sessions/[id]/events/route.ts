import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/store";
import { emitToTeachers } from "@/lib/socket-server";
import type { EventType } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type } = (await req.json()) as { type: EventType };

  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  const event = addEvent(id, type);
  if (!event)
    return NextResponse.json(
      { error: "Session not found or not active" },
      { status: 404 }
    );

  emitToTeachers("session:event", { sessionId: id, event });
  return NextResponse.json({ event }, { status: 201 });
}
