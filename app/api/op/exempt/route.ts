import { NextResponse } from "next/server";
import { isOpAuthenticated } from "@/lib/op-auth";
import { prisma } from "@/lib/prisma";

// GET /api/op/exempt → 현재 EXEMPT 상태인 클럽 목록
export async function GET() {
  if (!(await isOpAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubs = await prisma.club.findMany({
    where: { subscriptionStatus: "EXEMPT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      subscriptionEnd: true,
    },
  });

  return NextResponse.json(clubs);
}
