import { NextResponse } from "next/server";
import { isOpAuthenticated } from "@/lib/op-auth";
import { prisma } from "@/lib/prisma";
import { getNextSubscriptionEnd, type SubscriptionPlan } from "@/lib/subscription";

// GET  /api/op/requests  → list all pending requests
export async function GET() {
  if (!(await isOpAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.subscriptionRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      club: { select: { id: true, name: true, subscriptionStatus: true, subscriptionEnd: true } },
    },
  });

  return NextResponse.json(requests);
}

// POST /api/op/requests  → approve or reject a request
export async function POST(req: Request) {
  if (!(await isOpAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, action } = await req.json() as { requestId: number; action: "APPROVED" | "REJECTED" };

  const request = await prisma.subscriptionRequest.findUnique({
    where: { id: requestId },
    include: { club: true },
  });

  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "신청 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  if (action === "APPROVED") {
    const newEnd = getNextSubscriptionEnd(
      request.plan as SubscriptionPlan,
      request.club.subscriptionEnd
    );

    await prisma.$transaction([
      prisma.subscriptionRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", processedAt: new Date() },
      }),
      prisma.club.update({
        where: { id: request.clubId },
        data: { subscriptionStatus: "ACTIVE", subscriptionEnd: newEnd },
      }),
    ]);
  } else {
    await prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", processedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
