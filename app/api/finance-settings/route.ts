import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { ensureFinanceSchema } from "@/lib/finance-schema";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type FinanceSettingsRow = {
  ledgerEnabled: boolean;
  monthlyFeeDefault: number;
  yearlyFeeDefault: number;
  guestFeeDefault: number;
  openingBalance: number;
};

async function getSettings(clubId: number) {
  await ensureFinanceSchema();

  const rows = await prisma.$queryRaw<FinanceSettingsRow[]>`
    SELECT
      "ledgerEnabled",
      "monthlyFeeDefault",
      "yearlyFeeDefault",
      "guestFeeDefault",
      "openingBalance"
    FROM "ClubFinanceSettings"
    WHERE "clubId" = ${clubId}
    LIMIT 1
  `;

  return (
    rows[0] ?? {
      ledgerEnabled: false,
      monthlyFeeDefault: 0,
      yearlyFeeDefault: 0,
      guestFeeDefault: 0,
      openingBalance: 0,
    }
  );
}

export async function GET() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) {
      return unauthorizedResponse();
    }

    return NextResponse.json(await getSettings(admin.clubId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 설정을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) {
      return unauthorizedResponse();
    }

    await ensureFinanceSchema();

    const body = await req.json();
    const ledgerEnabled = Boolean(body.ledgerEnabled);
    const monthlyFeeDefault = Math.max(
      0,
      Number(body.monthlyFeeDefault) || 0
    );
    const yearlyFeeDefault = Math.max(
      0,
      Number(body.yearlyFeeDefault) || 0
    );
    const guestFeeDefault = Math.max(
      0,
      Number(body.guestFeeDefault) || 0
    );
    const openingBalance = Number(body.openingBalance) || 0;

    const rows = await prisma.$queryRaw<FinanceSettingsRow[]>`
      INSERT INTO "ClubFinanceSettings" (
        "clubId",
        "ledgerEnabled",
        "monthlyFeeDefault",
        "yearlyFeeDefault",
        "guestFeeDefault",
        "openingBalance",
        "updatedAt"
      )
      VALUES (
        ${admin.clubId},
        ${ledgerEnabled},
        ${monthlyFeeDefault},
        ${yearlyFeeDefault},
        ${guestFeeDefault},
        ${openingBalance},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("clubId")
      DO UPDATE SET
        "ledgerEnabled" = EXCLUDED."ledgerEnabled",
        "monthlyFeeDefault" = EXCLUDED."monthlyFeeDefault",
        "yearlyFeeDefault" = EXCLUDED."yearlyFeeDefault",
        "guestFeeDefault" = EXCLUDED."guestFeeDefault",
        "openingBalance" = EXCLUDED."openingBalance",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "ledgerEnabled",
        "monthlyFeeDefault",
        "yearlyFeeDefault",
        "guestFeeDefault",
        "openingBalance"
    `;

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}

