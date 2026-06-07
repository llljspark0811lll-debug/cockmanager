import { PrismaClient } from "@prisma/client";
import { getCalculatedSubscriptionStatus, shouldShowTrialBanner, getDaysRemaining } from "../lib/subscription";

const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findUnique({
    where: { id: 174 },
    select: { id: true, name: true, subscriptionStatus: true, subscriptionEnd: true, createdAt: true },
  });

  if (!club) { console.log("클럽 없음"); return; }

  const now = new Date();
  const status = getCalculatedSubscriptionStatus({
    subscriptionStatus: club.subscriptionStatus,
    subscriptionEnd: club.subscriptionEnd,
    now,
  });
  const daysRemaining = getDaysRemaining(club.subscriptionEnd, now);
  const showBanner = shouldShowTrialBanner(status, club.subscriptionEnd, now);

  console.log(`클럽: ${club.name} (ID: ${club.id})`);
  console.log(`가입일: ${club.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`);
  console.log(`subscriptionStatus (DB): ${club.subscriptionStatus}`);
  console.log(`subscriptionEnd: ${club.subscriptionEnd ? club.subscriptionEnd.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "없음 (무제한 트라이얼)"}`);
  console.log(`계산된 상태: ${status}`);
  console.log(`남은 일수: ${daysRemaining ?? "null (무제한)"}`);
  console.log(`배너 노출 여부: ${showBanner ? "✅ YES" : "❌ NO"}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
