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
    registeredCount,
    guestCount,
    waitlistCount,
    attendanceHandledCount,
    newMembersCount,
  ] = await Promise.all([
    prisma.clubSession.count({
      where: sessionWhere,
    }),
    prisma.sessionParticipant.count({
      where: {
        ...participantWhere,
        status: "REGISTERED",
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
    prisma.sessionParticipant.count({
      where: {
        ...participantWhere,
        status: "WAITLIST",
      },
    }),
    prisma.sessionParticipant.count({
      where: {
        ...participantWhere,
        status: "REGISTERED",
        attendanceStatus: {
          in: ["PRESENT", "LATE", "ABSENT"],
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
    registeredCount,
    guestCount,
    waitlistCount,
    attendanceHandledCount,
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

async function getTopMembersForPeriod(
  clubId: number,
  start: Date,
  end: Date
) {
  const [attendanceGroups, lateGroups, guestHostGroups] =
    await Promise.all([
      prisma.sessionParticipant.groupBy({
        by: ["memberId"],
        where: {
          memberId: {
            not: null,
          },
          status: "REGISTERED",
          session: {
            clubId,
            date: {
              gte: start,
              lt: end,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.sessionParticipant.groupBy({
        by: ["memberId"],
        where: {
          memberId: {
            not: null,
          },
          status: "REGISTERED",
          attendanceStatus: "LATE",
          session: {
            clubId,
            date: {
              gte: start,
              lt: end,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.sessionParticipant.groupBy({
        by: ["hostMemberId"],
        where: {
          hostMemberId: {
            not: null,
          },
          guestName: {
            not: null,
          },
          status: "REGISTERED",
          session: {
            clubId,
            date: {
              gte: start,
              lt: end,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

  const lateCountMap = new Map<number, number>(
    lateGroups
      .filter((group) => group.memberId !== null)
      .map((group) => [group.memberId as number, group._count._all])
  );
  const guestHostCountMap = new Map<number, number>(
    guestHostGroups
      .filter((group) => group.hostMemberId !== null)
      .map((group) => [
        group.hostMemberId as number,
        group._count._all,
      ])
  );

  const topMemberIds = attendanceGroups
    .filter((group) => group.memberId !== null)
    .sort((left, right) => right._count._all - left._count._all)
    .slice(0, 5)
    .map((group) => group.memberId as number);

  const topMemberRows =
    topMemberIds.length > 0
      ? await prisma.member.findMany({
          where: {
            id: {
              in: topMemberIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const topMemberRowMap = new Map(
    topMemberRows.map((member) => [member.id, member.name])
  );

  return attendanceGroups
    .filter((group) => group.memberId !== null)
    .sort((left, right) => {
      const countDiff = right._count._all - left._count._all;

      if (countDiff !== 0) {
        return countDiff;
      }

      const leftName =
        topMemberRowMap.get(left.memberId as number) ?? "";
      const rightName =
        topMemberRowMap.get(right.memberId as number) ?? "";

      return leftName.localeCompare(rightName, "ko");
    })
    .slice(0, 5)
    .map((group) => {
      const memberId = group.memberId as number;

      return {
        memberId,
        name: topMemberRowMap.get(memberId) ?? "회원",
        attendanceCount: group._count._all,
        lateCount: lateCountMap.get(memberId) ?? 0,
        guestHostedCount: guestHostCountMap.get(memberId) ?? 0,
      };
    });
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

    const [weekStats, monthStats, weekTopMembers, monthTopMembers] =
      await Promise.all([
        getPeriodStats(admin.clubId, weekRange.start, weekRange.end),
        getPeriodStats(admin.clubId, monthRange.start, monthRange.end),
        getTopMembersForPeriod(
          admin.clubId,
          weekRange.start,
          weekRange.end
        ),
        getTopMembersForPeriod(
          admin.clubId,
          monthRange.start,
          monthRange.end
        ),
      ]);

    const currentMonthUnpaidMembersCount =
      await getUnpaidMembersCount(admin.clubId, now);

    let custom = null;
    let customTopMembers;

    if (customStartInput && customEndInput) {
      const customStart = startOfDay(customStartInput);
      const customEndExclusive = addDays(
        startOfDay(customEndInput),
        1
      );
      const [customStats, customUnpaidMembersCount, nextTopMembers] =
        await Promise.all([
          getPeriodStats(
            admin.clubId,
            customStart,
            customEndExclusive
          ),
          getUnpaidMembersCount(admin.clubId, customEndInput),
          getTopMembersForPeriod(
            admin.clubId,
            customStart,
            customEndExclusive
          ),
        ]);

      custom = {
        ...customStats,
        unpaidMembersCount: customUnpaidMembersCount,
      };
      customTopMembers = nextTopMembers;
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
        week: weekTopMembers,
        month: monthTopMembers,
        custom: customTopMembers,
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
