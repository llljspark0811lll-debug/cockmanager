import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cutoffDate = new Date("2026-05-15T00:00:00+09:00");
  const sevenDaysAgo = new Date("2026-05-29T00:00:00+09:00"); // 오늘(6/5) 기준 7일 전

  // 최근 7일 이내 활동이 있는 clubId 목록 수집
  const [
    recentSessions,
    recentParticipants,
    recentComments,
    recentMembers,
    recentMemberRequests,
    recentPayments,
    recentSpecialFeePayments,
  ] = await Promise.all([
    prisma.clubSession.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, isSample: false },
      select: { clubId: true },
    }),
    prisma.sessionParticipant.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { session: { select: { clubId: true } } },
    }),
    prisma.sessionComment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { session: { select: { clubId: true } } },
    }),
    prisma.member.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, isSample: false },
      select: { clubId: true },
    }),
    prisma.memberRequest.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { clubId: true },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { clubId: true },
    }),
    prisma.specialFeePayment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { specialFee: { select: { clubId: true } } },
    }),
  ]);

  const activeClubIds = new Set<number>([
    ...recentSessions.map((r) => r.clubId),
    ...recentParticipants.map((r) => r.session.clubId),
    ...recentComments.map((r) => r.session.clubId),
    ...recentMembers.map((r) => r.clubId),
    ...recentMemberRequests.map((r) => r.clubId),
    ...recentPayments.map((r) => r.clubId),
    ...recentSpecialFeePayments.map((r) => r.specialFee.clubId),
  ]);

  // 활동 있는 클럽 전체 조회
  const clubs = await prisma.club.findMany({
    where: { id: { in: Array.from(activeClubIds) } },
    select: {
      id: true,
      name: true,
      createdAt: true,
      subscriptionStatus: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const before = clubs.filter((c) => c.createdAt < cutoffDate);
  const after = clubs.filter((c) => c.createdAt >= cutoffDate);

  console.log("=== 5월 15일 이전 가입 클럽 (7일 이내 활동 있음) ===");
  console.log(`총 ${before.length}개\n`);
  before.forEach((c, i) => {
    const date = c.createdAt.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    console.log(
      `${i + 1}. [${c.id}] ${c.name} — 가입: ${date} | 구독: ${c.subscriptionStatus}`
    );
  });

  console.log("\n=== 5월 15일 이후 가입 클럽 (7일 이내 활동 있음) ===");
  console.log(`총 ${after.length}개\n`);
  after.forEach((c, i) => {
    const date = c.createdAt.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    console.log(
      `${i + 1}. [${c.id}] ${c.name} — 가입: ${date} | 구독: ${c.subscriptionStatus}`
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
