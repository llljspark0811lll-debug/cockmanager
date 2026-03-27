import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { participantId, attendanceStatus } = await req.json();

    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        id: Number(participantId),
        session: {
          clubId: admin.clubId,
        },
      },
    });

    if (!participant) {
      return notFoundResponse("참가자를 찾을 수 없습니다.");
    }

    const updated = await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        attendanceStatus,
        checkedInAt:
          attendanceStatus === "PRESENT" ||
          attendanceStatus === "LATE"
            ? new Date()
            : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "출석 상태를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
