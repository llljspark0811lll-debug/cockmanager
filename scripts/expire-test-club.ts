import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { username: "team_d.shot" },
    select: { clubId: true },
  });

  if (!admin) { console.log("team_d.shot 계정 없음"); return; }

  // 만료 테스트용 — 어제 만료
  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  await prisma.club.update({
    where: { id: admin.clubId },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd: yesterday,
    },
  });

  const kst = new Date(yesterday.getTime() + 9 * 60 * 60 * 1000);
  console.log(`✅ club ID ${admin.clubId} → TRIAL, subscriptionEnd: ${kst.toISOString().slice(0, 10)} KST (만료됨)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
