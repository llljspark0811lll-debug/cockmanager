import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { promoteWaitlistIfPossible } from "@/lib/session-registration";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { participantId } = await req.json();

    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        id: Number(participantId),
        status: { in: ["REGISTERED", "WAITLIST"] },
        session: { clubId: admin.clubId },
      },
    });

    if (!participant) {
      return notFoundResponse("참가자를 찾을 수 없습니다.");
    }

    const wasRegistered = participant.status === "REGISTERED";

    await prisma.sessionParticipant.updateMany({
      where: { id: participant.id },
      data: {
        status: "CANCELED",
        attendanceStatus: "PENDING",
        checkedInAt: null,
      },
    });

    // 확정 인원이 취소된 경우 대기자 자동 승격
    if (wasRegistered) {
      await promoteWaitlistIfPossible(prisma, participant.sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "참가 취소를 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
