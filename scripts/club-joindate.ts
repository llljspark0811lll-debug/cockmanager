import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const clubs = await prisma.club.findMany({
    where: { id: { in: [142, 146, 181, 16, 111, 163] } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  clubs.forEach(c => {
    const kst = new Date(c.createdAt.getTime() + 9 * 60 * 60 * 1000);
    console.log(`#${c.id} ${c.name} | 가입일: ${kst.toISOString().slice(0, 10)} KST`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
