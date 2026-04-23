import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getNextRegistrationStatus,
} from "@/lib/session-registration";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const type = String(body.type ?? "");

    if (!["member", "guest"].includes(type) || !Number.isFinite(sessionId)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const session = await prisma.clubSession.findFirst({
      where: { id: sessionId, clubId: admin.clubId },
      select: {
        id: true,
        capacity: true,
        status: true,
        participants: {
          select: { id: true, memberId: true, status: true },
        },
      },
    });

    if (!session) return notFoundResponse("운동 일정을 찾을 수 없습니다.");

    if (session.status !== "OPEN") {
      return NextResponse.json(
        { error: "마감 상태의 일정은 참석자를 추가할 수 없습니다." },
        { status: 400 }
      );
    }

    const registeredCount = session.participants.filter(
      (p) => p.status === "REGISTERED"
    ).length;
    const nextStatus = getNextRegistrationStatus(session.capacity, registeredCount);
    const hasGuestCols = await hasSessionParticipantGuestProfileColumns();

    if (type === "member") {
      const memberId = Number(body.memberId);
      if (!Number.isFinite(memberId)) {
        return NextResponse.json({ error: "회원 정보가 올바르지 않습니다." }, { status: 400 });
      }

      const member = await prisma.member.findFirst({
        where: { id: memberId, clubId: admin.clubId, deleted: false },
      });
      if (!member) return notFoundResponse("회원을 찾을 수 없습니다.");

      const existing = session.participants.find((p) => p.memberId === memberId);

      if (existing && existing.status !== "CANCELED") {
        return NextResponse.json(
          { error: "이미 참석 신청된 회원입니다." },
          { status: 400 }
        );
      }

      if (existing) {
        await prisma.sessionParticipant.update({
          where: { id: existing.id },
          data: { status: nextStatus, attendanceStatus: "PENDING", checkedInAt: null },
        });
      } else if (hasGuestCols) {
        await prisma.sessionParticipant.create({
          data: { sessionId: session.id, memberId, status: nextStatus },
        });
      } else {
        await prisma.sessionParticipant.createMany({
          data: [{ sessionId: session.id, memberId, status: nextStatus }],
        });
      }

      return NextResponse.json({ success: true, status: nextStatus });
    }

    // guest
    const guestName = String(body.guestName ?? "").trim();
    const guestGender = String(body.guestGender ?? "").trim();
    const guestLevel = String(body.guestLevel ?? "").trim();
    const hostMemberId = body.hostMemberId ? Number(body.hostMemberId) : null;

    if (!guestName) {
      return NextResponse.json({ error: "게스트 이름을 입력해주세요." }, { status: 400 });
    }

    if (hasGuestCols) {
      await prisma.$executeRaw`
        INSERT INTO "SessionParticipant" (
          "sessionId", "memberId", "hostMemberId", "guestName",
          "guestGender", "guestLevel", status, "attendanceStatus", "createdAt"
        )
        VALUES (
          ${session.id}, NULL, ${hostMemberId}, ${guestName},
          ${guestGender}, ${guestLevel}, ${nextStatus}, 'PENDING', NOW()
        )
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "SessionParticipant" (
          "sessionId", "memberId", "hostMemberId", "guestName",
          status, "attendanceStatus", "createdAt"
        )
        VALUES (
          ${session.id}, NULL, ${hostMemberId}, ${guestName},
          ${nextStatus}, 'PENDING', NOW()
        )
      `;
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "참석자 등록에 실패했습니다." }, { status: 500 });
  }
}
