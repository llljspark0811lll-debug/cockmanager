import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 5월 15일 00:00 KST = 5월 14일 15:00 UTC
  const CUTOFF = new Date("2026-05-15T00:00:00+09:00");
  const trialEndForOldClubs = new Date(CUTOFF.getTime() + 30 * 24 * 60 * 60 * 1000); // 6월 14일

  // 5월 15일 이전 가입 클럽: 만료일 = 6월 14일
  const oldResult = await prisma.club.updateMany({
    where: {
      subscriptionStatus: { not: "EXEMPT" },
      createdAt: { lt: CUTOFF },
    },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd: trialEndForOldClubs,
    },
  });

  // 5월 15일 이후 가입 클럽: 만료일 = 가입일 + 30일 (개별 업데이트)
  const newClubs = await prisma.club.findMany({
    where: {
      subscriptionStatus: { not: "EXEMPT" },
      createdAt: { gte: CUTOFF },
    },
    select: { id: true, name: true, createdAt: true },
  });

  for (const club of newClubs) {
    await prisma.club.update({
      where: { id: club.id },
      data: {
        subscriptionStatus: "TRIAL",
        subscriptionEnd: new Date(club.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const kstOld = new Date(trialEndForOldClubs.getTime() + 9 * 60 * 60 * 1000);
  console.log(`✅ 5월 15일 이전 가입 ${oldResult.count}개 클럽 → TRIAL, subscriptionEnd: ${kstOld.toISOString().slice(0, 10)} KST`);
  console.log(`✅ 5월 15일 이후 가입 ${newClubs.length}개 클럽 → TRIAL, subscriptionEnd: 가입일 + 30일`);

  const exemptClubs = await prisma.club.findMany({
    where: { subscriptionStatus: "EXEMPT" },
    select: { id: true, name: true },
  });
  if (exemptClubs.length > 0) {
    console.log(`ℹ️  EXEMPT 유지 클럽 (${exemptClubs.length}개): ${exemptClubs.map(c => `${c.name}(#${c.id})`).join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
