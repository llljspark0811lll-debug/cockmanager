import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getNextRegistrationStatus,
  promoteWaitlistIfPossible,
} from "@/lib/session-registration";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { participantId } = await req.json();

    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        id: Number(participantId),
        status: "CANCELED",
        session: { clubId: admin.clubId },
      },
      include: {
        session: {
          select: {
            id: true,
            capacity: true,
            participants: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!participant) {
      return notFoundResponse("복구할 참가자를 찾을 수 없습니다.");
    }

    const registeredCount = participant.session.participants.filter(
      (item) => item.status === "REGISTERED"
    ).length;
    const nextStatus = getNextRegistrationStatus(
      participant.session.capacity,
      registeredCount
    );

    await prisma.sessionParticipant.updateMany({
      where: { id: participant.id },
      data: {
        status: nextStatus,
        attendanceStatus: "PENDING",
        checkedInAt: null,
      },
    });

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "참석 복구를 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}

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
      { error: "참석 취소를 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
