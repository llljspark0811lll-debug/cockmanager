import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekRange(referenceDate: Date) {
  const start = startOfDay(referenceDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  return {
    start,
    end: addDays(start, 7),
  };
}

function getMonthRange(referenceDate: Date) {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1
  );

  return { start, end };
}

function parseDateInput(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

async function getPeriodStats(
  clubId: number,
  start: Date,
  end: Date
) {
  const sessionWhere = {
    clubId,
    status: "CLOSED",
    date: {
      gte: start,
      lt: end,
    },
  } as const;

  const participantWhere = {
    session: sessionWhere,
  } as const;

  const [
    sessionCount,
    memberAttendanceCount,
    guestCount,
    newMembersCount,
  ] = await Promise.all([
    prisma.clubSession.count({
      where: sessionWhere,
    }),
    prisma.sessionParticipant.count({
      where: {
        ...participantWhere,
        status: "REGISTERED",
        guestName: null,
      },
    }),
    prisma.sessionParticipant.count({
      where: {
        ...participantWhere,
        status: "REGISTERED",
        guestName: {
          not: null,
        },
      },
    }),
    prisma.member.count({
      where: {
        clubId,
        deleted: false,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    }),
  ]);

  return {
    startDate: start,
    endDate: addDays(end, -1),
    sessionCount,
    memberAttendanceCount,
    guestCount,
    newMembersCount,
  };
}

async function getUnpaidMembersCount(
  clubId: number,
  referenceDate: Date
) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  const [activeMemberCount, paidFeeRows] = await Promise.all([
    prisma.member.count({
      where: {
        clubId,
        deleted: false,
      },
    }),
    prisma.fee.findMany({
      where: {
        year,
        month,
        paid: true,
        member: {
          clubId,
          deleted: false,
        },
      },
      select: {
        memberId: true,
      },
      distinct: ["memberId"],
    }),
  ]);

  return Math.max(0, activeMemberCount - paidFeeRows.length);
}

async function getMemberAttendanceStats(
  clubId: number,
  start: Date,
  end: Date
) {
  const sessions = await prisma.clubSession.findMany({
    where: { clubId, status: "CLOSED", date: { gte: start, lt: end } },
    select: { id: true, date: true },
    orderBy: { date: "asc" },
  });

  if (sessions.length === 0) {
    return { topMembers: [], absentMembers: [], allMembers: [], sessions: [] };
  }

  const sessionIds = sessions.map((s) => s.id);

  const [allMemberRows, participantRows] = await Promise.all([
    prisma.member.findMany({
      where: { clubId, deleted: false },
      select: { id: true, name: true, gender: true, level: true },
    }),
    prisma.sessionParticipant.findMany({
      where: {
        sessionId: { in: sessionIds },
        memberId: { not: null },
        status: "REGISTERED",
        guestName: null,
      },
      select: { memberId: true, sessionId: true },
    }),
  ]);

  const memberSessionMap = new Map<number, Set<number>>();
  for (const row of participantRows) {
    if (row.memberId === null) continue;
    if (!memberSessionMap.has(row.memberId)) {
      memberSessionMap.set(row.memberId, new Set());
    }
    memberSessionMap.get(row.memberId)!.add(row.sessionId);
  }

  const memberStats = allMemberRows.map((m) => {
    const attended = memberSessionMap.get(m.id) ?? new Set<number>();
    return {
      memberId: m.id,
      name: m.name,
      gender: m.gender,
      level: m.level,
      attendanceCount: attended.size,
      totalSessionCount: sessions.length,
      attendedSessionIds: Array.from(attended),
    };
  });

  const topMembers = [...memberStats]
    .filter((m) => m.attendanceCount > 0)
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount ||
        a.name.localeCompare(b.name, "ko")
    )
    .slice(0, 5);

  const absentMembers = [...memberStats]
    .sort(
      (a, b) =>
        a.attendanceCount - b.attendanceCount ||
        a.name.localeCompare(b.name, "ko")
    )
    .slice(0, 5);

  const allMembers = [...memberStats].sort((a, b) =>
    a.name.localeCompare(b.name, "ko")
  );

  return { topMembers, absentMembers, allMembers, sessions };
}

export async function GET(request: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const now = new Date();
    const weekRange = getWeekRange(now);
    const monthRange = getMonthRange(now);
    const { searchParams } = new URL(request.url);
    const customStartInput = parseDateInput(
      searchParams.get("startDate")
    );
    const customEndInput = parseDateInput(
      searchParams.get("endDate")
    );

    if (
      (searchParams.has("startDate") || searchParams.has("endDate")) &&
      (!customStartInput ||
        !customEndInput ||
        customStartInput > customEndInput)
    ) {
      return NextResponse.json(
        { error: "기간 설정이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const [weekStats, monthStats, weekMemberStats, monthMemberStats] =
      await Promise.all([
        getPeriodStats(admin.clubId, weekRange.start, weekRange.end),
        getPeriodStats(admin.clubId, monthRange.start, monthRange.end),
        getMemberAttendanceStats(admin.clubId, weekRange.start, weekRange.end),
        getMemberAttendanceStats(admin.clubId, monthRange.start, monthRange.end),
      ]);

    const currentMonthUnpaidMembersCount =
      await getUnpaidMembersCount(admin.clubId, now);

    let custom = null;
    let customTopMembers: Awaited<ReturnType<typeof getMemberAttendanceStats>>["topMembers"] | undefined;
    let customAbsentMembers: Awaited<ReturnType<typeof getMemberAttendanceStats>>["absentMembers"] | undefined;
    let customAllMembers: Awaited<ReturnType<typeof getMemberAttendanceStats>>["allMembers"] | undefined;
    let customSessions: Awaited<ReturnType<typeof getMemberAttendanceStats>>["sessions"] | undefined;

    if (customStartInput && customEndInput) {
      const customStart = startOfDay(customStartInput);
      const customEndExclusive = addDays(
        startOfDay(customEndInput),
        1
      );
      const [customStats, customUnpaidMembersCount, customMemberStats] =
        await Promise.all([
          getPeriodStats(admin.clubId, customStart, customEndExclusive),
          getUnpaidMembersCount(admin.clubId, customEndInput),
          getMemberAttendanceStats(admin.clubId, customStart, customEndExclusive),
        ]);

      custom = {
        ...customStats,
        unpaidMembersCount: customUnpaidMembersCount,
      };
      customTopMembers = customMemberStats.topMembers;
      customAbsentMembers = customMemberStats.absentMembers;
      customAllMembers = customMemberStats.allMembers;
      customSessions = customMemberStats.sessions;
    }

    return NextResponse.json({
      week: {
        ...weekStats,
        unpaidMembersCount: currentMonthUnpaidMembersCount,
      },
      month: {
        ...monthStats,
        unpaidMembersCount: currentMonthUnpaidMembersCount,
      },
      custom,
      topMembers: {
        week: weekMemberStats.topMembers,
        month: monthMemberStats.topMembers,
        custom: customTopMembers,
      },
      absentMembers: {
        week: weekMemberStats.absentMembers,
        month: monthMemberStats.absentMembers,
        custom: customAbsentMembers,
      },
      allMemberStats: {
        week: { members: weekMemberStats.allMembers, sessions: weekMemberStats.sessions },
        month: { members: monthMemberStats.allMembers, sessions: monthMemberStats.sessions },
        custom: customAllMembers !== undefined
          ? { members: customAllMembers, sessions: customSessions ?? [] }
          : undefined,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운영 통계를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
