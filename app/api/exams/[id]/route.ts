import { NextRequest, NextResponse } from "next/server";
import { exams } from "@/lib/store";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const exam = exams.get(id);
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ exam });
  });
}
