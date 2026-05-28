import { requireAuthAdmin, unauthorizedResponse, notFoundResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";

type BracketMode = "STANDARD" | "TEAM_BATTLE";

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

// PATCH /api/sessions/bracket/score
// Body: { sessionId, generationMode, roundNumber, courtNumber, scoreA, scoreB }
export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const generationMode = normalizeBracketMode(body.generationMode);
    const roundNumber = Number(body.roundNumber);
    const courtNumber = Number(body.courtNumber);
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

    // 저장된 bracket JSON에서 해당 variant 꺼내기
    const bracketRecord = session.bracket as {
      config: unknown;
      rounds: unknown;
      summary: unknown;
    };

    type VariantEnvelope<T> = { variants?: Partial<Record<BracketMode, T>> };

    const roundsEnvelope = bracketRecord.rounds as VariantEnvelope<{ rounds: unknown }>;
    const isVariant = Boolean(roundsEnvelope?.variants);

    // rounds 추출
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
      const variantRounds = roundsEnvelope.variants?.[generationMode]?.rounds;
      if (!variantRounds) return notFoundResponse("해당 모드의 대진표가 없습니다.");
      rounds = variantRounds as typeof rounds;
    } else {
      rounds = (bracketRecord.rounds as { rounds: typeof rounds }).rounds ?? (bracketRecord.rounds as typeof rounds);
    }

    // 해당 라운드/코트 매치 찾아서 점수 업데이트
    const targetRound = rounds.find((r) => r.roundNumber === roundNumber);
    if (!targetRound) return notFoundResponse("해당 라운드를 찾을 수 없습니다.");

    const targetMatch = targetRound.matches.find((m) => m.courtNumber === courtNumber);
    if (!targetMatch) return notFoundResponse("해당 경기를 찾을 수 없습니다.");

    targetMatch.scoreA = scoreA;
    targetMatch.scoreB = scoreB;

    // 변경된 rounds를 다시 저장
    let newRoundsPayload: unknown;
    if (isVariant) {
      newRoundsPayload = {
        variants: {
          ...roundsEnvelope.variants,
          [generationMode]: { rounds },
        },
      };
    } else {
      // 레거시 포맷 (variants 없음) — rounds 배열이 직접 저장된 경우
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
