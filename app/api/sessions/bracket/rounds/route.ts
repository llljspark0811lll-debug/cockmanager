import { requireAuthAdmin, unauthorizedResponse, notFoundResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";

type BracketMode = "STANDARD" | "TEAM_BATTLE";

function normalizeBracketMode(value: string | null | undefined): BracketMode {
  return value === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD";
}

// PATCH /api/sessions/bracket/rounds
// Body: { sessionId, generationMode, rounds }
export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const generationMode = normalizeBracketMode(body.generationMode);
    const rounds = body.rounds;

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

    type VariantEnvelope<T> = { variants?: Partial<Record<BracketMode, T>> };
    const roundsEnvelope = bracketRecord.rounds as VariantEnvelope<{ rounds: unknown }>;
    const isVariant = Boolean(roundsEnvelope?.variants);

    let newRoundsPayload: unknown;
    if (isVariant) {
      newRoundsPayload = {
        variants: {
          ...roundsEnvelope.variants,
          [generationMode]: { rounds },
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
