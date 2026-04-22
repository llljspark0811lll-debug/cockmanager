import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  generateSessionBracket,
  type SessionBracketPlayerInput,
} from "@/lib/session-bracket";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

function normalizeSavedBracket(
  bracket: {
    id: number;
    sessionId: number;
    config: unknown;
    rounds: unknown;
    summary: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null
) {
  if (!bracket) {
    return null;
  }

  return {
    id: bracket.id,
    sessionId: bracket.sessionId,
    config: bracket.config,
    rounds: bracket.rounds,
    summary: bracket.summary,
    createdAt: bracket.createdAt,
    updatedAt: bracket.updatedAt,
  };
}

async function findSessionForBracket(sessionId: number, clubId: number) {
  const includeGuestProfile = await hasSessionParticipantGuestProfileColumns();

  if (includeGuestProfile) {
    return prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        participants: {
          where: {
            status: "REGISTERED",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            memberId: true,
            guestName: true,
            guestGender: true,
            guestLevel: true,
            hostMember: {
              select: {
                id: true,
                name: true,
              },
            },
            member: {
              select: {
                id: true,
                name: true,
                gender: true,
                level: true,
              },
            },
          },
        },
        bracket: true,
      },
    });
  }

  return prisma.clubSession.findFirst({
    where: {
      id: sessionId,
      clubId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      participants: {
        where: {
          status: "REGISTERED",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          memberId: true,
          guestName: true,
          hostMember: {
            select: {
              id: true,
              name: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              gender: true,
              level: true,
            },
          },
        },
      },
      bracket: true,
    },
  });
}

function buildBracketPlayers(
  participants: Array<{
    id: number;
    memberId: number | null;
    guestName?: string | null;
    guestGender?: string | null;
    guestLevel?: string | null;
    hostMember?: { id: number; name: string } | null;
    member?: {
      id: number;
      name: string;
      gender: string;
      level: string;
    } | null;
  }>
) {
  const players: SessionBracketPlayerInput[] = [];

  const stripSamplePrefix = (name: string) => name.replace(/^\[체험\]\s*/, "").replace(/^\[체험\s*게스트\]\s*/, "");

  for (const participant of participants) {
    if (participant.member) {
      players.push({
        playerId: `member-${participant.member.id}`,
        participantId: participant.id,
        name: stripSamplePrefix(participant.member.name),
        gender: participant.member.gender,
        level: participant.member.level,
        isGuest: false,
        hostName: null,
      });
      continue;
    }

    if (participant.guestName) {
      players.push({
        playerId: `guest-${participant.id}`,
        participantId: participant.id,
        name: stripSamplePrefix(participant.guestName),
        gender: participant.guestGender ?? "",
        level: participant.guestLevel ?? "",
        isGuest: true,
        hostName: participant.hostMember ? stripSamplePrefix(participant.hostMember.name) : null,
      });
    }
  }

  return players;
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));

    if (!Number.isFinite(sessionId)) {
      return NextResponse.json(
        { error: "세션 정보를 다시 확인해주세요." },
        { status: 400 }
      );
    }

    await ensureSessionBracketTable();

    const session = await findSessionForBracket(sessionId, admin.clubId);

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    return NextResponse.json({
      sessionId: session.id,
      sessionTitle: session.title,
      participantCount: session.participants.length,
      bracket: normalizeSavedBracket(session.bracket),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "자동 대진표 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const courtCount = Number(body.courtCount);
    const minGamesPerPlayer = Number(body.minGamesPerPlayer);
    const separateByGender = Boolean(body.separateByGender);
    const fixedPairs: Array<[string, string]> = Array.isArray(body.fixedPairs)
      ? body.fixedPairs.filter(
          (pair: unknown): pair is [string, string] =>
            Array.isArray(pair) &&
            pair.length === 2 &&
            typeof pair[0] === "string" &&
            typeof pair[1] === "string"
        )
      : [];

    if (
      !Number.isFinite(sessionId) ||
      !Number.isFinite(courtCount) ||
      !Number.isFinite(minGamesPerPlayer)
    ) {
      return NextResponse.json(
        { error: "자동 대진표 설정 값을 다시 확인해주세요." },
        { status: 400 }
      );
    }

    await ensureSessionBracketTable();

    const session = await findSessionForBracket(sessionId, admin.clubId);

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    if (session.status !== "CLOSED") {
      return NextResponse.json(
        {
          error: "자동 대진표는 마감 처리된 운동 일정에서만 생성할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    const players = buildBracketPlayers(session.participants);
    const generated = generateSessionBracket({
      players,
      courtCount,
      minGamesPerPlayer,
      separateByGender,
      fixedPairs,
      seed: Date.now() + Math.floor(Math.random() * 1_000_000),
    });

    const savedBracket = await prisma.sessionBracket.upsert({
      where: {
        sessionId: session.id,
      },
      update: {
        config: generated.config as unknown as Prisma.InputJsonValue,
        rounds: generated.rounds as unknown as Prisma.InputJsonValue,
        summary: generated.summary as unknown as Prisma.InputJsonValue,
      },
      create: {
        sessionId: session.id,
        config: generated.config as unknown as Prisma.InputJsonValue,
        rounds: generated.rounds as unknown as Prisma.InputJsonValue,
        summary: generated.summary as unknown as Prisma.InputJsonValue,
      },
    });

    const club = await prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } });
    void sendTelegramAlert({
      event: "SESSION_BRACKET_CREATE",
      clubName: club?.name ?? String(admin.clubId),
      sessionTitle: session.title,
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionTitle: session.title,
      participantCount: session.participants.length,
      bracket: normalizeSavedBracket(savedBracket),
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "자동 대진표 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
