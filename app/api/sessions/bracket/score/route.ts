import { requireAuthAdmin, unauthorizedResponse, notFoundResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";
import { getVariantKey, normalizeLevelMode, type BracketMode } from "@/lib/bracket-variant-key";

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

// PATCH /api/sessions/bracket/score
// Body: { sessionId, generationMode, levelMode?, roundNumber, courtNumber, scoreA, scoreB, levelGroupId? }
export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const generationMode = normalizeBracketMode(body.generationMode);
    const levelMode = normalizeLevelMode(body.levelMode);
    const roundNumber = Number(body.roundNumber);
    const courtNumber = Number(body.courtNumber);
    const levelGroupId = typeof body.levelGroupId === "string" ? body.levelGroupId : null;
    // null 허용: 점수 삭제(초기화)도 지원
    const scoreA = body.scoreA === null ? null : Number(body.scoreA);
    const scoreB = body.scoreB === null ? null : Number(body.scoreB);

    if (!Number.isFinite(sessionId) || !Number.isFinite(roundNumber) || !Number.isFinite(courtNumber)) {
      return NextResponse.json({ error: "올바른 요청 값을 확인해 주세요." }, { status: 400 });
    }
    if (scoreA !== null && (!Number.isFinite(scoreA) || scoreA < 0)) {
      return NextResponse.json({ error: "점수는 0 이상의 숫자여야 합니다." }, { status: 400 });
    }
    if (scoreB !== null && (!Number.isFinite(scoreB) || scoreB < 0)) {
      return NextResponse.json({ error: "점수는 0 이상의 숫자여야 합니다." }, { status: 400 });
    }

    await ensureSessionBracketTable();

    const session = await prisma.clubSession.findFirst({
      where: { id: sessionId, clubId: admin.clubId },
      select: { id: true, bracket: true },
    });

    if (!session) return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    if (!session.bracket) return notFoundResponse("저장된 대진표가 없습니다.");

    const bracketRecord = session.bracket as {
      config: unknown;
      rounds: unknown;
      summary: unknown;
    };

    type VariantEnvelope<T> = { variants?: Partial<Record<string, T>> };

    const roundsEnvelope = bracketRecord.rounds as VariantEnvelope<{
      rounds: unknown;
      levelGroupRounds?: unknown;
    }>;
    const isVariant = Boolean(roundsEnvelope?.variants);
    const variantKey = getVariantKey(generationMode, levelMode);

    // 레벨 그룹 모드인지 확인 (새 키, 구 키 순으로 폴백)
    const variantData = isVariant
      ? (roundsEnvelope.variants?.[variantKey] ?? roundsEnvelope.variants?.["STANDARD"])
      : null;
    const isLevelGroupMode = levelGroupId !== null && variantData && "levelGroupRounds" in variantData;

    if (isLevelGroupMode && variantData) {
      // 레벨 그룹 모드: 해당 그룹의 rounds에서 점수 업데이트
      const levelGroupRounds = variantData.levelGroupRounds as Record<
        string,
        Array<{
          roundNumber: number;
          matches: Array<{
            courtNumber: number;
            scoreA?: number | null;
            scoreB?: number | null;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        }>
      >;

      const groupRounds = levelGroupRounds[levelGroupId];
      if (!groupRounds) return notFoundResponse("해당 그룹의 대진표가 없습니다.");

      const targetRound = groupRounds.find((r) => r.roundNumber === roundNumber);
      if (!targetRound) return notFoundResponse("해당 라운드를 찾을 수 없습니다.");

      const targetMatch = targetRound.matches.find((m) => m.courtNumber === courtNumber);
      if (!targetMatch) return notFoundResponse("해당 경기를 찾을 수 없습니다.");

      targetMatch.scoreA = scoreA;
      targetMatch.scoreB = scoreB;

      const newRoundsPayload = {
        variants: {
          ...roundsEnvelope.variants,
          [variantKey]: {
            ...variantData,
            levelGroupRounds: {
              ...levelGroupRounds,
              [levelGroupId]: groupRounds,
            },
          },
        },
      };

      await prisma.sessionBracket.update({
        where: { sessionId },
        data: { rounds: newRoundsPayload as never },
      });

      return NextResponse.json({ ok: true });
    }

    // 일반 모드
    let rounds: Array<{
      roundNumber: number;
      matches: Array<{
        courtNumber: number;
        scoreA?: number | null;
        scoreB?: number | null;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;

    if (isVariant) {
      const variantRounds = (roundsEnvelope.variants?.[variantKey] ?? roundsEnvelope.variants?.["STANDARD"])?.rounds;
      if (!variantRounds) return notFoundResponse("해당 모드의 대진표가 없습니다.");
      rounds = variantRounds as typeof rounds;
    } else {
      rounds = (bracketRecord.rounds as { rounds: typeof rounds }).rounds ?? (bracketRecord.rounds as typeof rounds);
    }

    const targetRound = rounds.find((r) => r.roundNumber === roundNumber);
    if (!targetRound) return notFoundResponse("해당 라운드를 찾을 수 없습니다.");

    const targetMatch = targetRound.matches.find((m) => m.courtNumber === courtNumber);
    if (!targetMatch) return notFoundResponse("해당 경기를 찾을 수 없습니다.");

    targetMatch.scoreA = scoreA;
    targetMatch.scoreB = scoreB;

    let newRoundsPayload: unknown;
    if (isVariant) {
      newRoundsPayload = {
        variants: {
          ...roundsEnvelope.variants,
          [variantKey]: { rounds },
        },
      };
    } else {
      newRoundsPayload = { rounds };
    }

    await prisma.sessionBracket.update({
      where: { sessionId },
      data: { rounds: newRoundsPayload as never },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "점수 저장에 실패했습니다." }, { status: 500 });
  }
}
