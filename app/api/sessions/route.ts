import { NextRequest, NextResponse } from "next/server";
import { getAllSessions, createSession } from "@/lib/store";
import { emitToTeachers } from "@/lib/socket-server";

export function GET() {
  return NextResponse.json({ sessions: getAllSessions() });
}

export async function POST(req: NextRequest) {
  const { studentName, studentId, examId } = await req.json();

  if (!studentName || !studentId || !examId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const session = createSession(studentName, studentId, examId);
  emitToTeachers("session:created", { session });

  return NextResponse.json({ session }, { status: 201 });
}
