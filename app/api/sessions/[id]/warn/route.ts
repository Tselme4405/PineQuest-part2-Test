import { NextRequest, NextResponse } from "next/server";
import { warnStudent } from "@/lib/store";
import { emitToTeachers, emitToSession } from "@/lib/socket-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = warnStudent(id);

  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  emitToTeachers("session:updated", { session });
  emitToSession(id, "warned", {
    warningCount: session.warningCount,
    status: session.status,
  });

  return NextResponse.json({ session });
}
