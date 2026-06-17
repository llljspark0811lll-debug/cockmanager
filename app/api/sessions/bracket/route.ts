import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  generateSessionBracket,
  generateSessionBracketLevelGroups,
  normalizeLevel,
  type SessionBracketPlayerInput,
} from "@/lib/session-bracket";
import { getClubLevels } from "@/lib/club-levels";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { sendTelegramAlert } from "@/lib/telegram";
import { getVariantKey, normalizeLevelMode, type BracketMode, type LevelMode } from "@/lib/bracket-variant-key";
import { NextResponse } from "next/server";
import type {
  SessionBracketLevelGroupData,
  SessionBracketRound,
  SessionBracketSummary,
} from "@/components/dashboard/types";

const RELAXED_MODE_MESSAGE =
  "현재 조건에서는 모든 선수의 경기수, 휴식수, 밸런스를 만족하는 대진표를 만들 수 없습니다.";

const RELAXABLE_ERROR_PATTERNS = [
  "연속 휴식 없이",
  "직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다",
  "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다",
  "최소 경기 수를 배정할 수 없습니다",
];

function canProceedWithRelaxedMode(errorMessage: string) {
  return RELAXABLE_ERROR_PATTERNS.some((pattern) =>
    errorMessage.includes(pattern)
  );
}

function buildRelaxedModeWarnings() {
  return [
    "일부 선수는 두 경기 연속 휴식할 수 있습니다.",
    "같은 파트너나 상대를 다시 만날 수 있습니다.",
    "일부 선수의 경기 수나 밸런스가 완벽하게 맞지 않을 수 있습니다.",
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
  variants?: Partial<Record<string, { config: unknown }>>;
};

type StoredRoundsVariantEnvelope = {
  variants?: Partial<Record<string, { rounds: unknown; levelGroupRounds?: unknown }>>;
};

type StoredSummaryVariantEnvelope = {
  variants?: Partial<Record<string, { summary: unknown; levelGroupSummaries?: unknown }>>;
};

type LevelGroupConfig = {
  id: string;
  name: string;
  levels: string[];
  courtCount: number;
};

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

function getStoredBracketVariant(
  bracket: SessionBracketRecord | null,
  mode: BracketMode,
  levelMode: LevelMode = "none"
) {
  if (!bracket) return null;

  const configEnvelope =
    bracket.config && typeof bracket.config === "object"
      ? (bracket.config as StoredConfigVariantEnvelope) : null;
  const roundsEnvelope =
    bracket.rounds && typeof bracket.rounds === "object"
      ? (bracket.rounds as StoredRoundsVariantEnvelope) : null;
  const summaryEnvelope =
    bracket.summary && typeof bracket.summary === "object"
      ? (bracket.summary as StoredSummaryVariantEnvelope) : null;

  // Try new key: STANDARD_none / STANDARD_separate / STANDARD_filter / TEAM_BATTLE
  const variantKey = getVariantKey(mode, levelMode);
  const configVariant = configEnvelope?.variants?.[variantKey];
  const roundsVariant = roundsEnvelope?.variants?.[variantKey];
  const summaryVariant = summaryEnvelope?.variants?.[variantKey];

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

  // Backward compat 1: old "STANDARD" key (before per-levelMode refactor)
  if (mode === "STANDARD") {
    const oldConfigVariant = configEnvelope?.variants?.["STANDARD"];
    const oldRoundsVariant = roundsEnvelope?.variants?.["STANDARD"];
    const oldSummaryVariant = summaryEnvelope?.variants?.["STANDARD"];

    if (oldConfigVariant && oldRoundsVariant && oldSummaryVariant) {
      const storedLevelMode = ((oldConfigVariant.config as Record<string, unknown>)?.levelMode ?? "none") as string;
      if (storedLevelMode === levelMode) {
        return {
          id: bracket.id,
          sessionId: bracket.sessionId,
          config: oldConfigVariant.config,
          rounds: oldRoundsVariant.rounds,
          summary: oldSummaryVariant.summary,
          createdAt: bracket.createdAt,
          updatedAt: bracket.updatedAt,
        };
      }
      return null;
    }
  }

  // Backward compat 2: no variants envelope (very old format)
  if (!configEnvelope?.variants) {
    const directConfig =
      bracket.config && typeof bracket.config === "object"
        ? (bracket.config as { generationMode?: BracketMode; levelMode?: string })
        : null;
    const directMode = normalizeBracketMode(directConfig?.generationMode);
    const directLevelMode = directConfig?.levelMode ?? "none";

    if (directMode === mode && (mode !== "STANDARD" || directLevelMode === levelMode)) {
      return bracket;
    }
  }

  return null;
}

function normalizeSavedBracket(
  bracket: SessionBracketRecord | null,
  mode: BracketMode,
  levelMode: LevelMode = "none"
) {
  const target = getStoredBracketVariant(bracket, mode, levelMode);

  if (!target) {
    return null;
  }

  const config = target.config as Record<string, unknown> | null;
  const savedLevelMode = config?.levelMode;

  if (savedLevelMode && savedLevelMode !== "none" && bracket) {
    const rawRoundsEnvelope = bracket.rounds as {
      variants?: Record<string, { rounds?: unknown; levelGroupRounds?: unknown }>;
    } | null;
    const rawSummaryEnvelope = bracket.summary as {
      variants?: Record<string, { summary?: unknown; levelGroupSummaries?: unknown }>;
    } | null;

    const variantKey = getVariantKey(mode, levelMode);
    const rawRoundsVariant = rawRoundsEnvelope?.variants?.[variantKey] ?? rawRoundsEnvelope?.variants?.[mode];
    const rawSummaryVariant = rawSummaryEnvelope?.variants?.[variantKey] ?? rawSummaryEnvelope?.variants?.[mode];

    const levelGroupRounds = (rawRoundsVariant?.levelGroupRounds ?? {}) as Record<string, SessionBracketRound[]>;
    const levelGroupSummaries = (rawSummaryVariant?.levelGroupSummaries ?? {}) as Record<string, SessionBracketSummary>;

    const levelGroupConfigs = (config?.levelGroups ?? []) as LevelGroupConfig[];

    const levelGroupData: SessionBracketLevelGroupData[] = levelGroupConfigs
      .map((g) => ({
        groupId: g.id,
        groupName: g.name,
        levels: g.levels,
        rounds: (levelGroupRounds[g.id] ?? []) as SessionBracketRound[],
        summary: (levelGroupSummaries[g.id] ?? {
          totalPlayers: 0,
          totalRounds: 0,
          totalMatches: 0,
          warnings: [],
          playerStats: [],
        }) as SessionBracketSummary,
      }))
      .filter((g) => g.rounds.length > 0);

    return {
      id: target.id,
      sessionId: target.sessionId,
      config: target.config,
      rounds: [],
      summary: target.summary,
      levelGroupData,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    };
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
  levelMode: LevelMode,
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

  const configVariants: Record<string, { config: unknown }> = Object.fromEntries(
    Object.entries(existingConfigEnvelope.variants ?? {}).filter(([, v]) => v !== undefined)
  ) as Record<string, { config: unknown }>;
  const roundsVariants: Record<string, { rounds: unknown; levelGroupRounds?: unknown }> = Object.fromEntries(
    Object.entries(existingRoundsEnvelope.variants ?? {}).filter(([, v]) => v !== undefined)
  ) as Record<string, { rounds: unknown; levelGroupRounds?: unknown }>;
  const summaryVariants: Record<string, { summary: unknown; levelGroupSummaries?: unknown }> = Object.fromEntries(
    Object.entries(existingSummaryEnvelope.variants ?? {}).filter(([, v]) => v !== undefined)
  ) as Record<string, { summary: unknown; levelGroupSummaries?: unknown }>;

  // Migration: very old format (no variants envelope) → new key format
  if (
    existingBracket &&
    !existingConfigEnvelope.variants &&
    !existingRoundsEnvelope.variants &&
    !existingSummaryEnvelope.variants
  ) {
    const storedConfig = existingBracket.config as { generationMode?: BracketMode; levelMode?: string } | null;
    const migratedMode = normalizeBracketMode(storedConfig?.generationMode);
    const migratedLevelMode = normalizeLevelMode(storedConfig?.levelMode);
    const migratedKey = getVariantKey(migratedMode, migratedLevelMode);
    configVariants[migratedKey] = { config: existingBracket.config };
    roundsVariants[migratedKey] = { rounds: existingBracket.rounds };
    summaryVariants[migratedKey] = { summary: existingBracket.summary };
  }

  // Migration: old "STANDARD" key → STANDARD_${levelMode} key
  if (
    configVariants["STANDARD"] &&
    !configVariants["STANDARD_none"] &&
    !configVariants["STANDARD_separate"] &&
    !configVariants["STANDARD_filter"]
  ) {
    const oldLevelMode = normalizeLevelMode(
      (configVariants["STANDARD"].config as Record<string, unknown>)?.levelMode as string | undefined
    );
    const migratedKey = `STANDARD_${oldLevelMode}`;
    configVariants[migratedKey] = configVariants["STANDARD"];
    roundsVariants[migratedKey] = roundsVariants["STANDARD"] ?? { rounds: null };
    summaryVariants[migratedKey] = summaryVariants["STANDARD"] ?? { summary: null };
    delete configVariants["STANDARD"];
    delete roundsVariants["STANDARD"];
    delete summaryVariants["STANDARD"];
  }

  // Write the new variant
  const variantKey = getVariantKey(mode, levelMode);
  configVariants[variantKey] = { config: generated.config };
  roundsVariants[variantKey] = { rounds: generated.rounds };
  summaryVariants[variantKey] = { summary: generated.summary };

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

function normalizeGenderForStats(gender: string | null | undefined): "남" | "여" | null {
  const v = String(gender ?? "").trim().toLowerCase();
  if (["남", "남자", "m", "male"].includes(v)) return "남";
  if (["여", "여자", "f", "female"].includes(v)) return "여";
  return null;
}

function calcPlayerStats(
  players: SessionBracketPlayerInput[],
  levelNameMap: Map<string, string>
) {
  let maleCount = 0;
  let femaleCount = 0;
  const levelCounts: Record<string, number> = {};

  for (const p of players) {
    const g = normalizeGenderForStats(p.gender);
    if (g === "남") maleCount++;
    else if (g === "여") femaleCount++;

    const rank = normalizeLevel(p.level);
    const levelName = levelNameMap.get(rank) ?? rank;
    levelCounts[levelName] = (levelCounts[levelName] ?? 0) + 1;
  }

  return { totalPlayers: players.length, maleCount, femaleCount, levelCounts };
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

  const stripSamplePrefix = (name: string) => name.replace(/^\[샘플\]\s*/, "").replace(/^\[샘플[^\]]*\]\s*/, "").replace(/^\[泥댄뿕\s*寃뚯뒪??]\s*/, "");

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
    const levelMode = normalizeLevelMode(searchParams.get("levelMode"));

    if (!Number.isFinite(sessionId)) {
      return NextResponse.json(
        { error: "올바른 세션 ID를 다시 확인해 주세요." },
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
      bracket: normalizeSavedBracket(session.bracket, generationMode, levelMode),
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

    const levelMode: "none" | "separate" | "filter" =
      body.levelMode === "separate" || body.levelMode === "filter"
        ? body.levelMode
        : "none";

    const rawLevelGroupsConfig: unknown[] = Array.isArray(body.levelGroupsConfig)
      ? body.levelGroupsConfig
      : [];
    const levelGroupsConfig: LevelGroupConfig[] = rawLevelGroupsConfig.filter(
      (g): g is LevelGroupConfig =>
        g !== null &&
        typeof g === "object" &&
        typeof (g as Record<string, unknown>).id === "string" &&
        typeof (g as Record<string, unknown>).name === "string" &&
        Array.isArray((g as Record<string, unknown>).levels) &&
        typeof (g as Record<string, unknown>).courtCount === "number"
    );

    if (
      !Number.isFinite(sessionId) ||
      !Number.isFinite(courtCount) ||
      !Number.isFinite(minGamesPerPlayer)
    ) {
      return NextResponse.json(
      { error: "자동 대진표 설정 값을 다시 확인해 주세요." },
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

    // 레벨 그룹 대진 모드 (STANDARD 전용)
    if (levelMode !== "none" && generationMode === "STANDARD" && levelGroupsConfig.length > 0) {
      // 인원 수 최소 검증
      for (const groupConfig of levelGroupsConfig) {
        const groupPlayers = players.filter((p) =>
          groupConfig.levels.includes(normalizeLevel(p.level))
        );
        if (groupPlayers.length < 4) {
          return NextResponse.json(
            {
              error: `"${groupConfig.name}" 그룹 인원이 ${groupPlayers.length}명입니다. 대진 생성에는 최소 4명이 필요합니다.`,
            },
            { status: 400 }
          );
        }
      }

      // 라운드별 동적 코트 배분으로 모든 그룹 동시 생성
      const groupResults = generateSessionBracketLevelGroups(
        levelGroupsConfig.map((groupConfig) => ({
          groupId: groupConfig.id,
          groupName: groupConfig.name,
          players: players.filter((p) =>
            groupConfig.levels.includes(normalizeLevel(p.level))
          ),
          fixedPairs: fixedPairs.filter(([a, b]) => {
            const gPlayers = players.filter((p) =>
              groupConfig.levels.includes(normalizeLevel(p.level))
            );
            return (
              gPlayers.some((p) => p.playerId === a) &&
              gPlayers.some((p) => p.playerId === b)
            );
          }),
        })),
        courtCount,
        minGamesPerPlayer,
        separateByGender,
        relaxedMode,
        Date.now() + Math.floor(Math.random() * 1_000_000)
      );

      const levelGroupRounds: Record<string, SessionBracketRound[]> = {};
      const levelGroupSummaries: Record<string, SessionBracketSummary> = {};
      for (const result of groupResults) {
        levelGroupRounds[result.groupId] = result.rounds;
        levelGroupSummaries[result.groupId] = result.summary;
      }

      const totalCourtCount = courtCount;

      const levelConfig = {
        courtCount: totalCourtCount,
        minGamesPerPlayer,
        separateByGender,
        relaxedMode,
        generationMode: "STANDARD" as const,
        fixedPairs,
        levelMode,
        levelGroups: levelGroupsConfig,
      };

      // 빈 summary (레벨 그룹 모드에서는 개별 그룹 summary 사용)
      const aggregateSummary = {
        totalPlayers: players.length,
        totalRounds: 0,
        totalMatches: 0,
        warnings: [],
        playerStats: [],
      };

      const storedPayload = buildStoredVariantPayload(session.bracket, "STANDARD", levelMode, {
        config: levelConfig,
        rounds: null as unknown,
        summary: aggregateSummary as unknown,
      });

      // rounds와 summary를 레벨그룹 구조로 오버라이드
      const variantKey = getVariantKey("STANDARD", levelMode);
      const roundsEnvelope = storedPayload.rounds as { variants: Record<string, unknown> };
      roundsEnvelope.variants[variantKey] = { rounds: null, levelGroupRounds };

      const summaryEnvelope = storedPayload.summary as { variants: Record<string, unknown> };
      summaryEnvelope.variants[variantKey] = { summary: aggregateSummary, levelGroupSummaries };

      const savedBracket = await prisma.sessionBracket.upsert({
        where: { sessionId: session.id },
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

      const [club, clubLevels] = await Promise.all([
        prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } }),
        getClubLevels(admin.clubId),
      ]);
      const levelNameMap = new Map(clubLevels.map((l) => [String(l.rank), l.name]));
      const stats = calcPlayerStats(players, levelNameMap);
      void sendTelegramAlert({
        event: "SESSION_BRACKET_CREATE",
        clubName: club?.name ?? String(admin.clubId),
        sessionTitle: session.title,
        generationMode: "STANDARD",
        courtCount: totalCourtCount,
        minGamesPerPlayer,
        separateByGender,
        fixedPairsCount: fixedPairs.length,
        ...stats,
      });

      return NextResponse.json({
        sessionId: session.id,
        sessionTitle: session.title,
        participantCount: session.participants.length,
        bracket: normalizeSavedBracket(savedBracket, "STANDARD", levelMode),
      });
    }

    // 기존 일반 대진 생성
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
      levelMode,
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

    const [club, clubLevels] = await Promise.all([
      prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } }),
      getClubLevels(admin.clubId),
    ]);
    const levelNameMap = new Map(clubLevels.map((l) => [String(l.rank), l.name]));
    const stats = calcPlayerStats(players, levelNameMap);
    void sendTelegramAlert({
      event: "SESSION_BRACKET_CREATE",
      clubName: club?.name ?? String(admin.clubId),
      sessionTitle: session.title,
      generationMode,
      courtCount,
      minGamesPerPlayer,
      separateByGender,
      fixedPairsCount: fixedPairs.length,
      ...stats,
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionTitle: session.title,
      participantCount: session.participants.length,
      bracket: normalizeSavedBracket(savedBracket, generationMode, levelMode),
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
      { error: "자동 대진표 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

