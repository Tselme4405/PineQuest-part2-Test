import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/store";
import { emitToTeachers, emitToSession } from "@/lib/socket-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = invalidateSession(id);

  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  emitToTeachers("session:updated", { session });
  emitToSession(id, "invalidated", { status: "invalid" });

  return NextResponse.json({ session });
}
