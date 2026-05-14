import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

type CourtPlayer = { participantId: number; name: string };
type Court = { id: number; teamA: CourtPlayer[]; teamB: CourtPlayer[] };
type CompletedMatch = {
  matchId: number;
  courtId: number;
  teamA: CourtPlayer[];
  teamB: CourtPlayer[];
  winner: "A" | "B" | null;
  completedAt: string;
};
type BoardData = {
  v?: number;
  courtCount?: number;
  courts?: Court[];
  history?: CompletedMatch[];
};

function parseBoardJson(raw: unknown): BoardData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as BoardData;
}

async function getClubName(clubId: number): Promise<string> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return club?.name ?? "";
}

// GET: 실시간 대진 모달 열기 (버튼 클릭) → START 알람
export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    const session = await prisma.clubSession.findFirst({
      where: { id: sessionId, clubId: admin.clubId },
      select: { id: true, title: true },
    });
    if (!session) return notFoundResponse("운동 일정을 찾을 수 없습니다.");

    const board = await prisma.courtBoard.findUnique({ where: { sessionId } });

    // 알람 전송 (쿼리와 분리)
    try {
      const clubName = await getClubName(admin.clubId);
      await sendTelegramAlert({
        event: "COURT_BOARD_START",
        clubName,
        sessionTitle: session.title,
        courtCount: parseBoardJson(board?.courts).courtCount ?? 2,
      });
    } catch (alertErr) {
      console.error("[court-board] GET alert error:", alertErr);
    }

    return NextResponse.json(board ?? null);
  } catch (error) {
    console.error("[court-board] GET error:", error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { sessionId } = await req.json();
    const parsedSessionId = Number(sessionId);

    const session = await prisma.clubSession.findFirst({
      where: { id: parsedSessionId, clubId: admin.clubId },
      select: { id: true },
    });
    if (!session) return notFoundResponse("운동 일정을 찾을 수 없습니다.");

    const board = await prisma.courtBoard.upsert({
      where: { sessionId: parsedSessionId },
      create: { sessionId: parsedSessionId, courts: [], isPublic: false },
      update: {},
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("[court-board] POST error:", error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { id, courts, isPublic } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: { id: true, courts: true, sessionId: true },
    });
    if (!existing) return notFoundResponse("코트보드를 찾을 수 없습니다.");

    const updated = await prisma.courtBoard.update({
      where: { id: parsedId },
      data: {
        ...(courts !== undefined ? { courts } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    // 알람: DB 업데이트 후 별도 처리
    if (courts !== undefined) {
      try {
        const [clubName, session] = await Promise.all([
          getClubName(admin.clubId),
          prisma.clubSession.findUnique({
            where: { id: existing.sessionId },
            select: { title: true },
          }),
        ]);
        const sessionTitle = session?.title ?? "";

        const oldData = parseBoardJson(existing.courts);
        const newData = parseBoardJson(courts);
        const oldCourts: Court[] = oldData.courts ?? [];
        const newCourts: Court[] = newData.courts ?? [];
        const oldHistory: CompletedMatch[] = oldData.history ?? [];
        const newHistory: CompletedMatch[] = newData.history ?? [];

        // 코트 배정 알람: 선수 수가 늘어난 코트
        for (const newCourt of newCourts) {
          const oldCourt = oldCourts.find((c) => c.id === newCourt.id);
          const oldTotal = (oldCourt?.teamA?.length ?? 0) + (oldCourt?.teamB?.length ?? 0);
          const newTotal = newCourt.teamA.length + newCourt.teamB.length;
          if (newTotal > oldTotal) {
            await sendTelegramAlert({
              event: "COURT_BOARD_COURT_ASSIGNED",
              clubName,
              sessionTitle,
              courtNumber: newCourt.id,
              teamA: newCourt.teamA.map((p) => p.name),
              teamB: newCourt.teamB.map((p) => p.name),
            });
          }
        }

        // 경기 완료 알람
        const oldMatchIds = new Set(oldHistory.map((m) => m.matchId));
        for (const match of newHistory) {
          if (!oldMatchIds.has(match.matchId)) {
            await sendTelegramAlert({
              event: "COURT_BOARD_MATCH_COMPLETE",
              clubName,
              sessionTitle,
              courtNumber: match.courtId,
              teamA: match.teamA.map((p) => p.name),
              teamB: match.teamB.map((p) => p.name),
              winner: match.winner,
            });
          }
        }
      } catch (alertErr) {
        console.error("[court-board] PUT alert error:", alertErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[court-board] PUT error:", error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { id } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: { id: true },
    });
    if (!existing) return notFoundResponse("코트보드를 찾을 수 없습니다.");

    await prisma.courtBoard.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[court-board] DELETE error:", error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}
