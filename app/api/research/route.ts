import { NextRequest, NextResponse } from "next/server";
import { researchAdapter } from "@/lib/adapters";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await researchAdapter.search(q);
  return NextResponse.json(results);
}
