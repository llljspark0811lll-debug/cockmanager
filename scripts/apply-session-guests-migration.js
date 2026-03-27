const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SessionParticipant"
    ALTER COLUMN "memberId" DROP NOT NULL;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SessionParticipant"
    ADD COLUMN IF NOT EXISTS "guestName" TEXT,
    ADD COLUMN IF NOT EXISTS "hostMemberId" INTEGER;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SessionParticipant_hostMemberId_fkey'
      ) THEN
        ALTER TABLE "SessionParticipant"
        ADD CONSTRAINT "SessionParticipant_hostMemberId_fkey"
        FOREIGN KEY ("hostMemberId")
        REFERENCES "Member"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SessionParticipant_hostMemberId_idx"
    ON "SessionParticipant"("hostMemberId");
  `);

  console.log("Session guest migration applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
