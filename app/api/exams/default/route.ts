import { NextResponse } from "next/server";
import { DEFAULT_EXAM } from "@/lib/store";

export function GET() {
  return NextResponse.json({ exam: DEFAULT_EXAM });
}
