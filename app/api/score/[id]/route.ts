import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

// PATCH /api/score/[id]
// Body: { visible: boolean }
// Toggle score visibility. Admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const scoreId = parseInt(id, 10);
  if (!Number.isFinite(scoreId)) {
    return NextResponse.json({ error: "Invalid score ID" }, { status: 400 });
  }

  const body = await request.json();
  const { visible } = body as { visible?: boolean };
  if (typeof visible !== "boolean") {
    return NextResponse.json({ error: "visible must be a boolean" }, { status: 400 });
  }

  await prisma.score.update({
    where: { id: scoreId },
    data: { visible },
  });

  return NextResponse.json({ ok: true });
}
