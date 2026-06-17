import { requireAuthAdmin, unauthorizedResponse, notFoundResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";
import { getVariantKey, normalizeLevelMode, type BracketMode } from "@/lib/bracket-variant-key";

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

// PATCH /api/sessions/bracket/rounds
// Body: { sessionId, generationMode, levelMode?, rounds, levelGroupId? }
export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const generationMode = normalizeBracketMode(body.generationMode);
    const levelMode = normalizeLevelMode(body.levelMode);
    const rounds = body.rounds;
    const levelGroupId = typeof body.levelGroupId === "string" ? body.levelGroupId : null;

    if (!Number.isFinite(sessionId)) {
      return NextResponse.json({ error: "올바른 요청 값을 확인해 주세요." }, { status: 400 });
    }
    if (!Array.isArray(rounds)) {
      return NextResponse.json({ error: "rounds 데이터가 올바르지 않습니다." }, { status: 400 });
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

    // 레벨 그룹 모드: 해당 그룹 rounds만 업데이트
    const variantData = isVariant ? (roundsEnvelope.variants?.[variantKey] ?? roundsEnvelope.variants?.["STANDARD"]) : null;
    const isLevelGroupMode = levelGroupId !== null && variantData && "levelGroupRounds" in variantData;

    if (isLevelGroupMode && variantData) {
      const levelGroupRounds = (variantData.levelGroupRounds ?? {}) as Record<string, unknown>;

      const newRoundsPayload = {
        variants: {
          ...roundsEnvelope.variants,
          [variantKey]: {
            ...variantData,
            levelGroupRounds: {
              ...levelGroupRounds,
              [levelGroupId]: rounds,
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
    return NextResponse.json({ error: "대진표 선수 배치 저장에 실패했습니다." }, { status: 500 });
  }
}
