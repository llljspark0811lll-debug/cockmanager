import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const CUTOFF = new Date("2026-05-15T00:00:00+09:00");
  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 5월 15일 이후 가입 클럽 전체
  const oldClubs = await prisma.club.findMany({
    where: { createdAt: { gte: CUTOFF } },
    select: { id: true, name: true, subscriptionStatus: true, subscriptionEnd: true },
  });

  const clubIds = oldClubs.map(c => c.id);

  // 최근 7일 내 활동이 있는 clubId 수집
  const [sessions, members, specialFees, specialFeePayments, requests] = await Promise.all([
    prisma.clubSession.findMany({
      where: { clubId: { in: clubIds }, createdAt: { gte: SEVEN_DAYS_AGO } },
      select: { clubId: true },
    }),
    prisma.member.findMany({
      where: { clubId: { in: clubIds }, createdAt: { gte: SEVEN_DAYS_AGO } },
      select: { clubId: true },
    }),
    prisma.specialFee.findMany({
      where: { clubId: { in: clubIds }, createdAt: { gte: SEVEN_DAYS_AGO } },
      select: { clubId: true },
    }),
    prisma.specialFeePayment.findMany({
      where: { specialFee: { clubId: { in: clubIds } }, createdAt: { gte: SEVEN_DAYS_AGO } },
      select: { specialFee: { select: { clubId: true } } },
    }),
    prisma.memberRequest.findMany({
      where: { clubId: { in: clubIds }, createdAt: { gte: SEVEN_DAYS_AGO } },
      select: { clubId: true },
    }),
  ]);

  const activeClubIds = new Set<number>([
    ...sessions.map(r => r.clubId),
    ...members.map(r => r.clubId),
    ...specialFees.map(r => r.clubId),
    ...specialFeePayments.map(r => r.specialFee.clubId),
    ...requests.map(r => r.clubId),
  ]);

  const activeClubs = oldClubs.filter(c => activeClubIds.has(c.id));

  console.log(`\n📋 5월 15일 이후 가입 + 최근 7일 활동 클럽 (${activeClubs.length}개)\n`);
  activeClubs.forEach(c => {
    const end = c.subscriptionEnd
      ? new Date(c.subscriptionEnd.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : "-";
    console.log(`  #${c.id} ${c.name} | 상태: ${c.subscriptionStatus} | 만료: ${end} KST`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
