import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
