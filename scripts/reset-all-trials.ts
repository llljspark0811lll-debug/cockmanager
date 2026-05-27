import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 6월 1일 00:00 KST = 5월 31일 15:00 UTC
  const startDate = new Date("2026-06-01T00:00:00+09:00");
  const trialEnd = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // EXEMPT 클럽은 건드리지 않음
  const result = await prisma.club.updateMany({
    where: {
      subscriptionStatus: { not: "EXEMPT" },
    },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd: trialEnd,
    },
  });

  const kst = new Date(trialEnd.getTime() + 9 * 60 * 60 * 1000);
  console.log(`✅ ${result.count}개 클럽 → TRIAL, subscriptionEnd: ${kst.toISOString().slice(0, 10)} KST (6월 1일부터 30일)`);

  const exemptClubs = await prisma.club.findMany({
    where: { subscriptionStatus: "EXEMPT" },
    select: { id: true, name: true },
  });
  if (exemptClubs.length > 0) {
    console.log(`ℹ️  EXEMPT 유지 클럽 (${exemptClubs.length}개): ${exemptClubs.map(c => `${c.name}(#${c.id})`).join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
