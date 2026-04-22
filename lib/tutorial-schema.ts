import { prisma } from "@/lib/prisma";

let ensured = false;

export async function ensureTutorialColumns() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ClubSession" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false
  `);

  ensured = true;
}
