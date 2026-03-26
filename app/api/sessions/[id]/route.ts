import { NextRequest, NextResponse } from "next/server";
import { getSession, submitAnswers } from "@/lib/store";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const session = getSession(id);
    if (!session)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ session });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { answers } = await req.json();
  const session = submitAnswers(id, answers);
  if (!session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}
