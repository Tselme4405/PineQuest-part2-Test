import { NextRequest, NextResponse } from "next/server";
import { registerFace } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { sessionId, imageData } = await req.json();

  if (!sessionId || !imageData)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  registerFace(sessionId, imageData);
  return NextResponse.json({ ok: true });
}
