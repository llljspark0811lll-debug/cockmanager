import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { username: "team_d.shot" },
    select: { clubId: true },
  });

  if (!admin) { console.log("team_d.shot 계정 없음"); return; }

  // 만료 테스트용 — 5일 남음
  const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  await prisma.club.update({
    where: { id: admin.clubId },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd: fiveDaysLater,
    },
  });

  const kst = new Date(fiveDaysLater.getTime() + 9 * 60 * 60 * 1000);
  console.log(`✅ club ID ${admin.clubId} → TRIAL, subscriptionEnd: ${kst.toISOString().slice(0, 10)} KST (5일 남음)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
