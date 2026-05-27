import { NextResponse } from "next/server";
import { isOpAuthenticated } from "@/lib/op-auth";
import { prisma } from "@/lib/prisma";

// GET /api/op/history → 승인/거절 처리된 전체 내역 (무제한)
export async function GET() {
  if (!(await isOpAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.subscriptionRequest.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { processedAt: "desc" },
    include: {
      club: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(history);
}
