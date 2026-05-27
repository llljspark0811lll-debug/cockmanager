/**
 * 기존 클럽들에 subscriptionEnd = 오늘 + 30일 적용
 * EXEMPT 상태 클럽은 건드리지 않음
 *
 * 실행: npx ts-node --skipProject scripts/migrate-trial-end.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const kst = new Date(trialEnd.getTime() + 9 * 60 * 60 * 1000);
  console.log(`체험 만료일 설정: ${kst.toISOString().replace("T", " ").slice(0, 19)} KST\n`);

  // subscriptionEnd가 없거나 이미 지난 클럽만 업데이트 (EXEMPT 제외)
  const result = await prisma.club.updateMany({
    where: {
      subscriptionStatus: { not: "EXEMPT" },
      OR: [
        { subscriptionEnd: null },
        { subscriptionEnd: { lt: new Date() } },
      ],
    },
    data: { subscriptionEnd: trialEnd },
  });

  console.log(`✅ ${result.count}개 클럽에 체험 만료일 설정 완료`);

  // 결과 확인
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, subscriptionStatus: true, subscriptionEnd: true },
    orderBy: { id: "asc" },
  });

  console.log("\n=== 전체 클럽 구독 현황 ===");
  for (const c of clubs) {
    const endStr = c.subscriptionEnd
      ? new Date(c.subscriptionEnd.getTime() + 9 * 60 * 60 * 1000)
          .toISOString().replace("T", " ").slice(0, 10) + " KST"
      : "없음";
    console.log(`  [${c.id}] ${c.name} | ${c.subscriptionStatus} | 만료: ${endStr}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
