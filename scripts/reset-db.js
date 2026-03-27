const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const RESET_SQL = `
TRUNCATE TABLE
  "SpecialFeePayment",
  "SpecialFee",
  "SessionParticipant",
  "ClubSession",
  "Payment",
  "Fee",
  "PasswordResetToken",
  "MemberRequest",
  "Member",
  "Admin",
  "Club"
RESTART IDENTITY CASCADE;
`;

async function main() {
  const hasForce = process.argv.includes("--force");

  if (!hasForce) {
    console.error(
      [
        "DB 초기화는 매우 파괴적인 작업입니다.",
        "계속하려면 아래처럼 --force 옵션을 붙여 실행하세요.",
        "",
        "npm run db:reset -- --force",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  console.log("원격 DB 초기화를 시작합니다...");
  await prisma.$executeRawUnsafe(RESET_SQL);
  console.log("DB 초기화가 완료되었습니다. 이제 /admin/signup에서 새 클럽을 만들면 됩니다.");
}

main()
  .catch((error) => {
    console.error("DB 초기화 중 오류가 발생했습니다.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
