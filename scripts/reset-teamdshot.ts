import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const trialEnd = new Date("2026-07-01T00:00:00+09:00");
  await prisma.club.update({
    where: { id: 11 },
    data: { subscriptionStatus: "TRIAL", subscriptionEnd: trialEnd },
  });
  console.log("✅ club ID 11 (team_d.shot) → TRIAL, subscriptionEnd: 2026-07-01 KST");
}
main().catch(console.error).finally(() => prisma.$disconnect());
