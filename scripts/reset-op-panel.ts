import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.subscriptionRequest.deleteMany({});
  console.log(`✅ 구독 신청 내역 전체 삭제: ${deleted.count}건 (대기/승인/거절 모두)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
