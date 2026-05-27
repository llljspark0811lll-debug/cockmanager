import { NextResponse } from "next/server";
import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const plan = String(body.plan ?? "") as SubscriptionPlan;
    const depositorName = String(body.depositorName ?? "").trim();

    if (!SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.json({ error: "올바른 플랜을 선택해 주세요." }, { status: 400 });
    }
    if (!depositorName) {
      return NextResponse.json({ error: "입금자명을 입력해 주세요." }, { status: 400 });
    }

    const planInfo = SUBSCRIPTION_PLANS[plan];
    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { id: true, name: true },
    });
    if (!club) return NextResponse.json({ error: "클럽 정보를 찾을 수 없습니다." }, { status: 404 });

    // Cancel any existing pending request for this club
    await prisma.subscriptionRequest.updateMany({
      where: { clubId: admin.clubId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const request = await prisma.subscriptionRequest.create({
      data: {
        clubId: admin.clubId,
        plan,
        amount: planInfo.amount,
        depositorName,
      },
    });

    void sendTelegramAlert({
      event: "SUBSCRIPTION_REQUEST",
      clubId: club.id,
      clubName: club.name,
      plan: `${planInfo.label} (${plan})`,
      amount: planInfo.amount,
      depositorName,
    });

    return NextResponse.json({ requestId: request.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
