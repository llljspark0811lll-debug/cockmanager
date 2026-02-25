import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { memberId, year } = await req.json();

    const operations = Array.from({ length: 12 }, (_, i) =>
      prisma.fee.upsert({
        where: {
          memberId_year_month: {
            memberId,
            year,
            month: i + 1,
          },
        },
        update: {
          paid: true,
        },
        create: {
          memberId,
          year,
          month: i + 1,
          paid: true,
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}