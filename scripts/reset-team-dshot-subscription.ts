import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { username: "team_d.shot" },
    select: { clubId: true },
  });

  if (!admin) { console.log("team_d.shot 계정 없음"); return; }

  const { count } = await prisma.subscriptionRequest.deleteMany({
    where: { clubId: admin.clubId },
  });

  const subscriptionEnd = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

  await prisma.club.update({
    where: { id: admin.clubId },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionEnd,
    },
  });

  const kst = new Date(subscriptionEnd.getTime() + 9 * 60 * 60 * 1000);
  console.log(`✅ SubscriptionRequest ${count}건 삭제`);
  console.log(`✅ club ID ${admin.clubId} → TRIAL, subscriptionEnd: ${kst.toISOString().slice(0, 10)} KST (9일 남음, 6/14 만료)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
