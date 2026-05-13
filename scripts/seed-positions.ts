/**
 * 직위 초기 데이터 마이그레이션 스크립트
 * 실행: npx tsx scripts/seed-positions.ts
 *
 * - 모든 클럽에 기본 직위 3개 생성 (없는 경우에만)
 * - 직위가 없는 기존 회원에게 "회원" 직위 자동 배정
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_POSITIONS = [
  { name: "관리자", order: 0 },
  { name: "운영진", order: 1 },
  { name: "회원", order: 2 },
];

async function main() {
  const clubs = await prisma.club.findMany({ select: { id: true, name: true } });
  console.log(`총 ${clubs.length}개 클럽 처리 시작`);

  for (const club of clubs) {
    const existingCount = await prisma.clubPosition.count({
      where: { clubId: club.id },
    });

    if (existingCount > 0) {
      console.log(`[${club.name}] 직위 이미 존재 (${existingCount}개) - 건너뜀`);
      continue;
    }

    await prisma.clubPosition.createMany({
      data: DEFAULT_POSITIONS.map((p) => ({ ...p, clubId: club.id })),
    });
    console.log(`[${club.name}] 기본 직위 3개 생성 완료`);

    const memberPosition = await prisma.clubPosition.findFirst({
      where: { clubId: club.id, name: "회원" },
    });

    if (!memberPosition) continue;

    const updated = await prisma.member.updateMany({
      where: { clubId: club.id, positionId: null },
      data: { positionId: memberPosition.id },
    });
    console.log(`[${club.name}] 기존 회원 ${updated.count}명 → "회원" 직위 배정`);
  }

  console.log("마이그레이션 완료");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
