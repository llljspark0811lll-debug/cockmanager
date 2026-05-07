import { prisma } from "@/lib/prisma";
import {
  createPublicMemberToken,
  verifyPublicMemberToken,
} from "@/lib/public-member-auth";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { NextResponse } from "next/server";

function hasMissingGuestProfileColumns(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("guestAge") ||
    message.includes("guestGender") ||
    message.includes("guestLevel") ||
    message.includes("The column") ||
    message.includes("P2022")
  );
}

function mapGuestParticipantToDraft(
  participant: {
    guestName: string | null;
    guestAge?: number | null;
    guestGender?: string | null;
    guestLevel?: string | null;
  }
) {
  return {
    name: participant.guestName ?? "",
    age:
      participant.guestAge === null
        ? ""
        : String(participant.guestAge),
    gender: participant.guestGender ?? "",
    level: participant.guestLevel ?? "",
  };
}

async function findSessionForIdentify(token: string) {
  const includeGuestProfile =
    await hasSessionParticipantGuestProfileColumns();

  if (includeGuestProfile) {
    return await prisma.clubSession.findUnique({
      where: { publicToken: token },
      include: {
        participants: {
          select: {
            id: true,
            status: true,
            memberId: true,
            hostMemberId: true,
            guestName: true,
            guestAge: true,
            guestGender: true,
            guestLevel: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  return await prisma.clubSession.findUnique({
    where: { publicToken: token },
    include: {
      participants: {
        select: {
          id: true,
          status: true,
          memberId: true,
          hostMemberId: true,
          guestName: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const rememberToken = String(body.rememberToken ?? "").trim();
    const memberId = body.memberId ? Number(body.memberId) : null;

    if (!token) {
      return NextResponse.json(
        { error: "운동 일정 링크가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const session = await findSessionForIdentify(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let member = null;

    if (rememberToken) {
      const payload = await verifyPublicMemberToken(rememberToken);

      if (payload && payload.clubId === session.clubId) {
        member = await prisma.member.findFirst({
          where: {
            id: payload.memberId,
            clubId: session.clubId,
            deleted: false,
          },
        });
      }
    } else {
      if (!memberId) {
        return NextResponse.json(
          { error: "회원을 선택해주세요." },
          { status: 400 }
        );
      }

      member = await prisma.member.findFirst({
        where: {
          id: memberId,
          clubId: session.clubId,
          deleted: false,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: "회원 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    if (!member) {
      return NextResponse.json(
        { error: "자동 인식에 실패했습니다. 다시 확인해주세요." },
        { status: 404 }
      );
    }

    const participant = session.participants.find(
      (item) => item.memberId === member.id
    );

    const guests = session.participants
      .filter(
        (item) =>
          item.hostMemberId === member.id &&
          item.status !== "CANCELED" &&
          item.guestName
      )
      .map(mapGuestParticipantToDraft);

    const nextRememberToken =
      rememberToken ||
      (await createPublicMemberToken({
        clubId: session.clubId,
        memberId: member.id,
      }));

    return NextResponse.json({
      success: true,
      rememberToken: nextRememberToken,
      member: {
        id: member.id,
        name: member.name,
        currentStatus: participant?.status ?? "NONE",
        guests,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 확인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
