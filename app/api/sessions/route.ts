import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  rebalanceRegisteredParticipantsToCapacity,
} from "@/lib/session-registration";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { NextResponse } from "next/server";

async function getSessionSummaries(clubId: number) {
  const sessions = await prisma.clubSession.findMany({
    where: { clubId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      publicToken: true,
      date: true,
      startTime: true,
      endTime: true,
      capacity: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  const counts =
    sessions.length === 0
      ? []
      : await prisma.sessionParticipant.groupBy({
          by: ["sessionId", "status"],
          where: {
            sessionId: {
              in: sessions.map((session) => session.id),
            },
          },
          _count: {
            _all: true,
          },
        });

  const countMap = new Map<string, number>();

  for (const row of counts) {
    countMap.set(`${row.sessionId}-${row.status}`, row._count._all);
  }

  return sessions.map((session) => ({
    ...session,
    registeredCount: countMap.get(`${session.id}-REGISTERED`) ?? 0,
    waitlistedCount: countMap.get(`${session.id}-WAITLIST`) ?? 0,
  }));
}

async function findSessionDetail(sessionId: number, clubId: number) {
  const includeGuestProfile = await hasSessionParticipantGuestProfileColumns();

  if (includeGuestProfile) {
    return prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId,
      },
      include: {
        participants: {
          select: {
            id: true,
            sessionId: true,
            memberId: true,
            guestName: true,
            guestAge: true,
            guestGender: true,
            guestLevel: true,
            hostMemberId: true,
            status: true,
            attendanceStatus: true,
            checkedInAt: true,
            createdAt: true,
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            hostMember: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  return prisma.clubSession.findFirst({
    where: {
      id: sessionId,
      clubId,
    },
    include: {
      participants: {
        select: {
          id: true,
          sessionId: true,
          memberId: true,
          guestName: true,
          hostMemberId: true,
          status: true,
          attendanceStatus: true,
          checkedInAt: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          hostMember: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get("id");
    const sessionId = sessionIdParam ? Number(sessionIdParam) : null;

    if (
      sessionIdParam !== null &&
      sessionId !== null &&
      Number.isFinite(sessionId)
    ) {
      const session = await findSessionDetail(sessionId, admin.clubId);

      if (!session) {
        return notFoundResponse("운동 일정을 찾을 수 없습니다.");
      }

      return NextResponse.json({
        ...session,
        registeredCount: session.participants.filter(
          (participant) => participant.status === "REGISTERED"
        ).length,
        waitlistedCount: session.participants.filter(
          (participant) => participant.status === "WAITLIST"
        ).length,
      });
    }

    return NextResponse.json(await getSessionSummaries(admin.clubId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 목록을 불러오지 못했습니다." },
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
    const { title, description, location, date, startTime, endTime, capacity } =
      body;

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        {
          error: "제목, 날짜, 시작 시간, 종료 시간은 필수입니다.",
        },
        { status: 400 }
      );
    }

    const session = await prisma.clubSession.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : "",
        location: location ? String(location).trim() : "",
        date: new Date(date),
        startTime: String(startTime),
        endTime: String(endTime),
        capacity:
          capacity === "" || capacity === null || capacity === undefined
            ? null
            : Number(capacity),
        clubId: admin.clubId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        publicToken: true,
        date: true,
        startTime: true,
        endTime: true,
        capacity: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...session,
      registeredCount: 0,
      waitlistedCount: 0,
      participants: [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      location,
      date,
      startTime,
      endTime,
      capacity,
      status,
    } = body;

    const sessionId = Number(id);

    const existingSession = await prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId: admin.clubId,
      },
    });

    if (!existingSession) {
      return notFoundResponse("수정할 일정을 찾을 수 없습니다.");
    }

    const updatedSession = await prisma.clubSession.update({
      where: { id: existingSession.id },
      data: {
        title:
          title !== undefined ? String(title).trim() : existingSession.title,
        description:
          description !== undefined
            ? String(description).trim()
            : existingSession.description,
        location:
          location !== undefined
            ? String(location).trim()
            : existingSession.location,
        date: date ? new Date(date) : existingSession.date,
        startTime: startTime ?? existingSession.startTime,
        endTime: endTime ?? existingSession.endTime,
        capacity:
          capacity === undefined
            ? existingSession.capacity
            : capacity === "" || capacity === null
              ? null
              : Number(capacity),
        status: status ?? existingSession.status,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        publicToken: true,
        date: true,
        startTime: true,
        endTime: true,
        capacity: true,
        status: true,
        createdAt: true,
      },
    });

    await rebalanceRegisteredParticipantsToCapacity(
      prisma,
      updatedSession.id,
      updatedSession.capacity
    );

    const refreshedSession = await findSessionDetail(updatedSession.id, admin.clubId);

    if (!refreshedSession) {
      return NextResponse.json(updatedSession);
    }

    return NextResponse.json({
      ...refreshedSession,
      registeredCount: refreshedSession.participants.filter(
        (participant) => participant.status === "REGISTERED"
      ).length,
      waitlistedCount: refreshedSession.participants.filter(
        (participant) => participant.status === "WAITLIST"
      ).length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const sessionId = Number(id);

    const existingSession = await prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId: admin.clubId,
      },
    });

    if (!existingSession) {
      return notFoundResponse("삭제할 일정을 찾을 수 없습니다.");
    }

    await prisma.clubSession.delete({
      where: { id: existingSession.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
