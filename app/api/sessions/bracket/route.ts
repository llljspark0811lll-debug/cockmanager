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

type BracketMode = "STANDARD" | "TEAM_BATTLE";

type SessionBracketRecord = {
  id: number;
  sessionId: number;
  config: unknown;
  rounds: unknown;
  summary: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type StoredConfigVariantEnvelope = {
  variants?: Partial<Record<BracketMode, { config: unknown }>>;
};

type StoredRoundsVariantEnvelope = {
  variants?: Partial<Record<BracketMode, { rounds: unknown }>>;
};

type StoredSummaryVariantEnvelope = {
  variants?: Partial<Record<BracketMode, { summary: unknown }>>;
};

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

function getStoredBracketVariant(
  bracket: SessionBracketRecord | null,
  mode: BracketMode
) {
  if (!bracket) {
    return null;
  }

  const configEnvelope =
    bracket.config && typeof bracket.config === "object"
      ? (bracket.config as StoredConfigVariantEnvelope)
      : null;
  const roundsEnvelope =
    bracket.rounds && typeof bracket.rounds === "object"
      ? (bracket.rounds as StoredRoundsVariantEnvelope)
      : null;
  const summaryEnvelope =
    bracket.summary && typeof bracket.summary === "object"
      ? (bracket.summary as StoredSummaryVariantEnvelope)
      : null;

  const configVariant = configEnvelope?.variants?.[mode];
  const roundsVariant = roundsEnvelope?.variants?.[mode];
  const summaryVariant = summaryEnvelope?.variants?.[mode];

  if (configVariant && roundsVariant && summaryVariant) {
    return {
      id: bracket.id,
      sessionId: bracket.sessionId,
      config: configVariant.config,
      rounds: roundsVariant.rounds,
      summary: summaryVariant.summary,
      createdAt: bracket.createdAt,
      updatedAt: bracket.updatedAt,
    };
  }

  const directConfig =
    bracket.config && typeof bracket.config === "object"
      ? (bracket.config as { generationMode?: BracketMode })
      : null;
  const directMode = normalizeBracketMode(directConfig?.generationMode);

  if (!configEnvelope?.variants && directMode === mode) {
    return bracket;
  }

  return null;
}

function normalizeSavedBracket(
  bracket: SessionBracketRecord | null,
  mode: BracketMode
) {
  const target = getStoredBracketVariant(bracket, mode);

  if (!target) {
    return null;
  }

  return {
    id: target.id,
    sessionId: target.sessionId,
    config: target.config,
    rounds: target.rounds,
    summary: target.summary,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
  };
}

function buildStoredVariantPayload(
  existingBracket: SessionBracketRecord | null,
  mode: BracketMode,
  generated: {
    config: unknown;
    rounds: unknown;
    summary: unknown;
  }
) {
  const existingConfigEnvelope =
    existingBracket?.config && typeof existingBracket.config === "object"
      ? (existingBracket.config as StoredConfigVariantEnvelope)
      : {};
  const existingRoundsEnvelope =
    existingBracket?.rounds && typeof existingBracket.rounds === "object"
      ? (existingBracket.rounds as StoredRoundsVariantEnvelope)
      : {};
  const existingSummaryEnvelope =
    existingBracket?.summary && typeof existingBracket.summary === "object"
      ? (existingBracket.summary as StoredSummaryVariantEnvelope)
      : {};

  const fallbackMode = normalizeBracketMode(
    (
      existingBracket?.config as
        | { generationMode?: BracketMode }
        | undefined
        | null
    )?.generationMode
  );

  const configVariants = { ...(existingConfigEnvelope.variants ?? {}) };
  const roundsVariants = { ...(existingRoundsEnvelope.variants ?? {}) };
  const summaryVariants = { ...(existingSummaryEnvelope.variants ?? {}) };

  if (
    existingBracket &&
    !existingConfigEnvelope.variants &&
    !existingRoundsEnvelope.variants &&
    !existingSummaryEnvelope.variants
  ) {
    configVariants[fallbackMode] = { config: existingBracket.config };
    roundsVariants[fallbackMode] = { rounds: existingBracket.rounds };
    summaryVariants[fallbackMode] = { summary: existingBracket.summary };
  }

  configVariants[mode] = { config: generated.config };
  roundsVariants[mode] = { rounds: generated.rounds };
  summaryVariants[mode] = { summary: generated.summary };

  return {
    config: { variants: configVariants } as Prisma.InputJsonValue,
    rounds: { variants: roundsVariants } as Prisma.InputJsonValue,
    summary: { variants: summaryVariants } as Prisma.InputJsonValue,
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
            guestAge: true,
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
                birth: true,
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
              birth: true,
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
    guestAge?: number | null;
    guestGender?: string | null;
    guestLevel?: string | null;
    hostMember?: { id: number; name: string } | null;
    member?: {
      id: number;
      name: string;
      gender: string;
      birth?: Date | null;
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
        birth: participant.member.birth ?? null,
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
        age: participant.guestAge ?? null,
        isGuest: true,
        hostName: participant.hostMember ? stripSamplePrefix(participant.hostMember.name) : null,
      });
    }
  }

  return players;
}

function normalizeTeamAssignments(
  value: unknown
): Record<string, "A" | "B"> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, "A" | "B"] =>
      typeof entry[0] === "string" &&
      (entry[1] === "A" || entry[1] === "B")
  );

  return Object.fromEntries(entries);
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));
    const generationMode = normalizeBracketMode(
      searchParams.get("generationMode")
    );

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
      bracket: normalizeSavedBracket(session.bracket, generationMode),
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
    const generationMode =
      body.generationMode === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
    const teamAssignments = normalizeTeamAssignments(body.teamAssignments);
    const rawTeamLabels =
      body.teamLabels && typeof body.teamLabels === "object"
        ? (body.teamLabels as Record<string, unknown>)
        : {};
    const teamLabels = {
      A:
        typeof rawTeamLabels.A === "string" && rawTeamLabels.A.trim()
          ? rawTeamLabels.A.trim()
          : "팀A",
      B:
        typeof rawTeamLabels.B === "string" && rawTeamLabels.B.trim()
          ? rawTeamLabels.B.trim()
          : "팀B",
    };
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
      generationMode,
      teamAssignments,
      teamLabels,
      fixedPairs,
      seed: Date.now() + Math.floor(Math.random() * 1_000_000),
    });

    const storedPayload = buildStoredVariantPayload(
      session.bracket,
      generationMode,
      generated
    );

    const savedBracket = await prisma.sessionBracket.upsert({
      where: {
        sessionId: session.id,
      },
      update: {
        config: storedPayload.config,
        rounds: storedPayload.rounds,
        summary: storedPayload.summary,
      },
      create: {
        sessionId: session.id,
        config: storedPayload.config,
        rounds: storedPayload.rounds,
        summary: storedPayload.summary,
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
      bracket: normalizeSavedBracket(savedBracket, generationMode),
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
