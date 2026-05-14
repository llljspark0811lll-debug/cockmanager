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
  if (!raw || typeof raw !== "object") return {};
  return raw as BoardData;
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    const session = await prisma.clubSession.findFirst({
      where: { id: sessionId, clubId: admin.clubId },
      select: { id: true },
    });

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    const board = await prisma.courtBoard.findUnique({
      where: { sessionId },
    });

    return NextResponse.json(board ?? null);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { sessionId } = await req.json();
    const parsedSessionId = Number(sessionId);

    const session = await prisma.clubSession.findFirst({
      where: { id: parsedSessionId, clubId: admin.clubId },
      select: {
        id: true,
        title: true,
        club: { select: { name: true } },
      },
    });

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    const existing = await prisma.courtBoard.findUnique({
      where: { sessionId: parsedSessionId },
      select: { id: true },
    });

    const board = await prisma.courtBoard.upsert({
      where: { sessionId: parsedSessionId },
      create: { sessionId: parsedSessionId, courts: [], isPublic: false },
      update: {},
    });

    // 새로 생성된 경우에만 알람 (기존 board가 없었을 때)
    if (!existing) {
      void sendTelegramAlert({
        event: "COURT_BOARD_START",
        clubName: session.club.name,
        sessionTitle: session.title,
        courtCount: 2,
      });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id, courts, isPublic } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: {
        id: true,
        courts: true,
        session: {
          select: {
            title: true,
            club: { select: { name: true } },
          },
        },
      },
    });

    if (!existing) {
      return notFoundResponse("코트보드를 찾을 수 없습니다.");
    }

    const updated = await prisma.courtBoard.update({
      where: { id: parsedId },
      data: {
        ...(courts !== undefined ? { courts } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    // 알람: 기존 데이터와 새 데이터 비교
    if (courts !== undefined) {
      const clubName = existing.session.club.name;
      const sessionTitle = existing.session.title;
      const oldData = parseBoardJson(existing.courts);
      const newData = parseBoardJson(courts);

      const oldCourts: Court[] = oldData.courts ?? [];
      const newCourts: Court[] = newData.courts ?? [];
      const oldHistory: CompletedMatch[] = oldData.history ?? [];
      const newHistory: CompletedMatch[] = newData.history ?? [];

      // 코트 배정 알람: 양 팀 모두 선수가 생긴 코트 (이전엔 한 팀 이상 비어있었던 코트)
      for (const newCourt of newCourts) {
        const hasA = newCourt.teamA.length > 0;
        const hasB = newCourt.teamB.length > 0;
        if (!hasA || !hasB) continue;

        const oldCourt = oldCourts.find((c) => c.id === newCourt.id);
        const wasIncomplete =
          !oldCourt ||
          oldCourt.teamA.length === 0 ||
          oldCourt.teamB.length === 0;

        if (wasIncomplete) {
          void sendTelegramAlert({
            event: "COURT_BOARD_COURT_ASSIGNED",
            clubName,
            sessionTitle,
            courtNumber: newCourt.id,
            teamA: newCourt.teamA.map((p) => p.name),
            teamB: newCourt.teamB.map((p) => p.name),
          });
        }
      }

      // 경기 완료 알람: 새로 추가된 history 항목
      const oldMatchIds = new Set(oldHistory.map((m) => m.matchId));
      for (const match of newHistory) {
        if (!oldMatchIds.has(match.matchId)) {
          void sendTelegramAlert({
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
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: { id: true },
    });

    if (!existing) {
      return notFoundResponse("코트보드를 찾을 수 없습니다.");
    }

    await prisma.courtBoard.delete({ where: { id: parsedId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}
