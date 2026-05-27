import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const daysRemaining = Number(process.argv[2]);
  if (!daysRemaining || isNaN(daysRemaining)) {
    console.log("Usage: ts-node scripts/set-trial-days.ts <days>");
    return;
  }

  const admin = await prisma.admin.findUnique({
    where: { username: "team_d.shot" },
    select: { clubId: true },
  });

  if (!admin) { console.log("team_d.shot 계정 없음"); return; }

  const futureDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

  await prisma.club.update({
    where: { id: admin.clubId },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd: futureDate,
    },
  });

  const kst = new Date(futureDate.getTime() + 9 * 60 * 60 * 1000);
  const elapsed = 30 - daysRemaining;
  console.log(`✅ club ID ${admin.clubId} → TRIAL, subscriptionEnd: ${kst.toISOString().slice(0, 10)} KST (${daysRemaining}일 남음, ${elapsed}일차)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
