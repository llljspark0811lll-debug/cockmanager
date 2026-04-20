import { prisma } from "@/lib/prisma";

let checked = false;

export async function ensureSessionNoticeColumn() {
  if (checked) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ClubSession"
    ADD COLUMN IF NOT EXISTS "notice" TEXT NOT NULL DEFAULT ''
  `);

  checked = true;
}
