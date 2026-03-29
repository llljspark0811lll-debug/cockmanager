const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Admin"
    ADD COLUMN IF NOT EXISTS "email" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key"
    ON "Admin"("email");
  `);

  console.log("Admin.email 컬럼과 고유 인덱스 적용이 완료되었습니다.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
