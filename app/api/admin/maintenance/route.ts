import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const config = await prisma.maintenanceConfig.findUnique({
    where: { id: "main" },
  });

  if (!config) {
    return NextResponse.json({
      maintenanceMode: false,
      maintenanceWindow: "02:00 - 04:00 UTC",
      maintenanceStatus: "UPGRADING NODES",
      maintenanceNote:
        "กำลังอัปเกรดระบบ Lightning และประสิทธิภาพการเล่นเกม เพื่อให้ธุรกรรมเร็วและเสถียรมากขึ้น",
    });
  }

  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return unauthorized();
  }

  if (session.user.role !== "ADMIN") {
    return forbidden();
  }

  const body = await request.json();

  const maintenanceMode =
    typeof body.maintenanceMode === "boolean"
      ? body.maintenanceMode
      : undefined;
  const maintenanceWindow =
    typeof body.maintenanceWindow === "string"
      ? body.maintenanceWindow.trim()
      : undefined;
  const maintenanceStatus =
    typeof body.maintenanceStatus === "string"
      ? body.maintenanceStatus.trim()
      : undefined;
  const maintenanceNote =
    typeof body.maintenanceNote === "string"
      ? body.maintenanceNote.trim()
      : undefined;

  if (
    typeof maintenanceMode === "undefined" &&
    typeof maintenanceWindow === "undefined" &&
    typeof maintenanceStatus === "undefined" &&
    typeof maintenanceNote === "undefined"
  ) {
    return NextResponse.json(
      {
        error:
          "Provide at least one field: maintenanceMode, maintenanceWindow, maintenanceStatus, maintenanceNote",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.maintenanceConfig.upsert({
    where: { id: "main" },
    update: {
      ...(typeof maintenanceMode !== "undefined" ? { maintenanceMode } : {}),
      ...(typeof maintenanceWindow !== "undefined"
        ? { maintenanceWindow }
        : {}),
      ...(typeof maintenanceStatus !== "undefined"
        ? { maintenanceStatus }
        : {}),
      ...(typeof maintenanceNote !== "undefined" ? { maintenanceNote } : {}),
    },
    create: {
      id: "main",
      maintenanceMode: maintenanceMode ?? false,
      maintenanceWindow: maintenanceWindow || "02:00 - 04:00 UTC",
      maintenanceStatus: maintenanceStatus || "UPGRADING NODES",
      maintenanceNote:
        maintenanceNote ||
        "กำลังอัปเกรดระบบ Lightning และประสิทธิภาพการเล่นเกม เพื่อให้ธุรกรรมเร็วและเสถียรมากขึ้น",
    },
  });

  return NextResponse.json({ success: true, ...updated });
}
