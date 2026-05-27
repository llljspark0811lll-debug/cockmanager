import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create SubscriptionRequest table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SubscriptionRequest" (
      "id"            SERIAL PRIMARY KEY,
      "plan"          TEXT NOT NULL,
      "amount"        INTEGER NOT NULL,
      "depositorName" TEXT NOT NULL,
      "status"        TEXT NOT NULL DEFAULT 'PENDING',
      "note"          TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "processedAt"   TIMESTAMP(3),
      "clubId"        INTEGER NOT NULL,
      CONSTRAINT "SubscriptionRequest_clubId_fkey"
        FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SubscriptionRequest_clubId_idx"
      ON "SubscriptionRequest"("clubId")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SubscriptionRequest_status_createdAt_idx"
      ON "SubscriptionRequest"("status", "createdAt")
  `);

  // Also add CANCELLED status support (just ensure the column is TEXT, already fine)
  console.log("✅ SubscriptionRequest 테이블 생성 완료");

  // Verify
  const count = await prisma.subscriptionRequest.count();
  console.log(`현재 구독 신청 수: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
