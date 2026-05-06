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

const RELAXED_MODE_MESSAGE =
  "?꾩옱 議곌굔?먯꽌??紐⑤뱺 ?좎닔??寃쎄린?? ?댁떇?? 諛몃윴?ㅻ? 留뚯”?섎뒗 ?吏꾪몴瑜?留뚮뱾 ???놁뒿?덈떎.";

const RELAXABLE_ERROR_PATTERNS = [
  "?곗냽 ?댁떇 ?놁씠",
  "吏곸쟾 ?쇱슫?쒕? ???몄썝??紐⑤몢 ?대쾲 ?쇱슫?쒖뿉 ?ｌ쓣 ???놁뒿?덈떎",
  "吏곸쟾 ?쇱슫???댁떇 ?몄썝??紐⑤몢 ?ㅼ쓬 ?쇱슫?쒖뿉 諛곗튂?????놁뒿?덈떎",
  "理쒖냼 寃쎄린 ?섎? 諛곗젙?????놁뒿?덈떎",
];

function canProceedWithRelaxedMode(errorMessage: string) {
  return RELAXABLE_ERROR_PATTERNS.some((pattern) =>
    errorMessage.includes(pattern)
  );
}

function buildRelaxedModeWarnings() {
  return [
    "?쇰? ?좎닔????寃쎄린 ?곗냽 ?댁떇?????덉뒿?덈떎.",
    "媛숈? ?뚰듃?덈굹 ?곷?瑜??ㅼ떆 留뚮궇 ???덉뒿?덈떎.",
    "?쇰? ?좎닔??寃쎄린 ?섎굹 諛몃윴?ㅺ? ?꾨꼍?섍쾶 留욎? ?딆쓣 ???덉뒿?덈떎.",
  ];
}

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

  const stripSamplePrefix = (name: string) => name.replace(/^\[泥댄뿕\]\s*/, "").replace(/^\[泥댄뿕\s*寃뚯뒪??]\s*/, "");

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
        { error: "?몄뀡 ?뺣낫瑜??ㅼ떆 ?뺤씤?댁＜?몄슂." },
        { status: 400 }
      );
    }

    await ensureSessionBracketTable();

    const session = await findSessionForBracket(sessionId, admin.clubId);

    if (!session) {
      return notFoundResponse("?대룞 ?쇱젙??李얠쓣 ???놁뒿?덈떎.");
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
      { error: "?먮룞 ?吏꾪몴 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??" },
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
    const relaxedMode = Boolean(body.relaxedMode);
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
        { error: "?먮룞 ?吏꾪몴 ?ㅼ젙 媛믪쓣 ?ㅼ떆 ?뺤씤?댁＜?몄슂." },
        { status: 400 }
      );
    }

    await ensureSessionBracketTable();

    const session = await findSessionForBracket(sessionId, admin.clubId);

    if (!session) {
      return notFoundResponse("?대룞 ?쇱젙??李얠쓣 ???놁뒿?덈떎.");
    }

    if (session.status !== "CLOSED") {
      return NextResponse.json(
        {
          error: "?먮룞 ?吏꾪몴??留덇컧 泥섎━???대룞 ?쇱젙?먯꽌留??앹꽦?????덉뒿?덈떎.",
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
      relaxedMode,
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
      generationMode,
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
      if (canProceedWithRelaxedMode(error.message)) {
        return NextResponse.json(
          {
            error: RELAXED_MODE_MESSAGE,
            canProceedWithRelaxedMode: true,
            warnings: buildRelaxedModeWarnings(),
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "?먮룞 ?吏꾪몴 ?앹꽦???ㅽ뙣?덉뒿?덈떎." },
      { status: 500 }
    );
  }
}

