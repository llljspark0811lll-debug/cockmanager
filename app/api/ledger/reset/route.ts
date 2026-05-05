import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { ensureFinanceSchema } from "@/lib/finance-schema";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) {
      return unauthorizedResponse();
    }

    await ensureFinanceSchema();

    await prisma.$executeRaw`
      DELETE FROM "LedgerEntry"
      WHERE "clubId" = ${admin.clubId}
    `;

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });

    void sendTelegramAlert({
      event: "LEDGER_RESET",
      clubName: club?.name ?? String(admin.clubId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "장부를 초기화하지 못했습니다." },
      { status: 500 }
    );
  }
}
