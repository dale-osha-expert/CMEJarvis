import { NextRequest, NextResponse } from "next/server";
import { approveAction, rejectAction, executeAction, getProposedAction } from "@/lib/actions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = await getProposedAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(action);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, notes } = await request.json();

  try {
    let result;
    if (action === "approve") result = await approveAction(id, notes);
    else if (action === "reject") result = await rejectAction(id, notes);
    else if (action === "execute") result = await executeAction(id);
    else return NextResponse.json({ error: "Invalid action. Use approve, reject, or execute." }, { status: 400 });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
