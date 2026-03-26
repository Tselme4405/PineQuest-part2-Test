import { NextRequest, NextResponse } from "next/server";
import { submitAnswers } from "@/lib/store";
import { emitToTeachers } from "@/lib/socket-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { answers } = await req.json();

  const session = submitAnswers(id, answers);
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  emitToTeachers("session:completed", { session });
  return NextResponse.json({ session });
}
