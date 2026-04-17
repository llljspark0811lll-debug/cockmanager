import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";

function getRegisteredParticipantsCount(
  participants: Array<{ status: string }>
) {
  return participants.filter(
    (participant) => participant.status === "REGISTERED"
  ).length;
}

function getWaitlistedParticipantsCount(
  participants: Array<{ status: string }>
) {
  return participants.filter(
    (participant) => participant.status === "WAITLIST"
  ).length;
}

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

async function findSessionByPublicToken(token: string) {
  const includeGuestProfile =
    await hasSessionParticipantGuestProfileColumns();

  if (includeGuestProfile) {
    return await prisma.clubSession.findUnique({
      where: {
        publicToken: String(token).trim(),
      },
      include: {
        club: {
          select: {
            name: true,
            publicJoinToken: true,
          },
        },
        participants: {
          select: {
            id: true,
            status: true,
            guestName: true,
            guestAge: true,
            guestGender: true,
            guestLevel: true,
            hostMemberId: true,
            member: {
              select: {
                id: true,
                name: true,
                gender: true,
                level: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  return await prisma.clubSession.findUnique({
    where: {
      publicToken: String(token).trim(),
    },
    include: {
      club: {
        select: {
          name: true,
          publicJoinToken: true,
        },
      },
      participants: {
        select: {
          id: true,
          status: true,
          guestName: true,
          hostMemberId: true,
          member: {
            select: {
              id: true,
              name: true,
              gender: true,
              level: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const session = await findSessionByPublicToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const registeredParticipants = session.participants.filter(
      (participant) => participant.status === "REGISTERED"
    );
    const waitlistedParticipants = session.participants.filter(
      (participant) => participant.status === "WAITLIST"
    );
    // 동반 게스트(hostMemberId 있음)는 제외 — 호스트 회원이 불참 명단에 이미 표시됨
    const absentParticipants = session.participants.filter(
      (participant) =>
        participant.status === "CANCELED" &&
        participant.hostMemberId === null
    );

    const toPublicParticipant = (
      participant: (typeof session.participants)[number]
    ) => {
      const guestProfileParticipant = participant as typeof participant & {
        guestAge?: number | null;
        guestGender?: string | null;
        guestLevel?: string | null;
      };

      return {
        id: participant.id,
        type: participant.guestName ? ("GUEST" as const) : ("MEMBER" as const),
        name: participant.guestName ?? participant.member?.name ?? "이름 없음",
        age: guestProfileParticipant.guestAge ?? null,
        gender:
          guestProfileParticipant.guestGender ??
          participant.member?.gender ??
          null,
        level:
          guestProfileParticipant.guestLevel ??
          participant.member?.level ??
          null,
      };
    };

    return NextResponse.json({
      id: session.id,
      publicToken: session.publicToken,
      title: session.title,
      description: session.description,
      location: session.location,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      capacity: session.capacity,
      status: session.status,
      clubName: session.club.name,
      joinToken: session.club.publicJoinToken,
      registeredCount: getRegisteredParticipantsCount(session.participants),
      waitlistCount: getWaitlistedParticipantsCount(session.participants),
      registeredMemberCount: registeredParticipants.filter(
        (participant) => !participant.guestName
      ).length,
      registeredGuestCount: registeredParticipants.filter((participant) =>
        Boolean(participant.guestName)
      ).length,
      waitlistMemberCount: waitlistedParticipants.filter(
        (participant) => !participant.guestName
      ).length,
      waitlistGuestCount: waitlistedParticipants.filter((participant) =>
        Boolean(participant.guestName)
      ).length,
      registeredParticipants: registeredParticipants.map(toPublicParticipant),
      waitlistedParticipants: waitlistedParticipants.map(toPublicParticipant),
      absentParticipants: absentParticipants.map(toPublicParticipant),
    });
  } catch (error) {
    console.error(error);

    if (hasMissingGuestProfileColumns(error)) {
      return NextResponse.json(
        { error: "운동 일정 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "운동 일정 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
